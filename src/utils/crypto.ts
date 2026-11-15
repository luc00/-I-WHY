import { EncryptedPayload, VAULT_LIMITS, VaultMeta } from '../types/why';

export const VAULT_VERIFIER_PLAINTEXT = 'IWHY_VAULT_VERIFIED_V1';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto API non disponibile in questo ambiente.');
  }
  return subtle;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function generateSaltBase64(length = 16): string {
  const salt = new Uint8Array(length);
  globalThis.crypto.getRandomValues(salt);
  return bytesToBase64(salt);
}

export async function deriveAesKey(
  passphrase: string,
  saltBase64: string,
  iterations: number = VAULT_LIMITS.PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  if (!passphrase || passphrase.length < VAULT_LIMITS.MIN_PASSPHRASE_LENGTH) {
    throw new Error(
      `La passphrase deve contenere almeno ${VAULT_LIMITS.MIN_PASSPHRASE_LENGTH} caratteri.`
    );
  }

  const subtle = getSubtle();
  const baseKey = await subtle.importKey(
    'raw',
    textEncoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const saltBytes = base64ToBytes(saltBase64);
  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptJson<T>(
  key: CryptoKey,
  data: T,
  keyVersion: number = VAULT_LIMITS.KEY_VERSION
): Promise<EncryptedPayload> {
  const subtle = getSubtle();
  const iv = new Uint8Array(12);
  globalThis.crypto.getRandomValues(iv);

  const plaintext = textEncoder.encode(JSON.stringify(data));
  const encryptedBuffer = await subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    key,
    plaintext as BufferSource
  );

  const ciphertext = bytesToBase64(new Uint8Array(encryptedBuffer));
  if (ciphertext.length > VAULT_LIMITS.MAX_CIPHERTEXT_LENGTH) {
    throw new Error('Contenuto troppo grande per la crittografia sicura del vault.');
  }

  return {
    ciphertext,
    iv: bytesToBase64(iv),
    keyVersion,
  };
}

export async function decryptJson<T>(
  key: CryptoKey,
  payload: { ciphertext: string; iv: string }
): Promise<T> {
  const subtle = getSubtle();
  const ivBytes = base64ToBytes(payload.iv);
  const cipherBytes = base64ToBytes(payload.ciphertext);

  const decryptedBuffer = await subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes as BufferSource,
    },
    key,
    cipherBytes as BufferSource
  );

  const json = textDecoder.decode(decryptedBuffer);
  return JSON.parse(json) as T;
}

export async function createVaultCredentials(
  passphrase: string,
  keyVersion: number = VAULT_LIMITS.KEY_VERSION
): Promise<{ key: CryptoKey; meta: VaultMeta }> {
  const salt = generateSaltBase64(16);
  const iterations = VAULT_LIMITS.PBKDF2_ITERATIONS;
  const key = await deriveAesKey(passphrase, salt, iterations);
  const verifier = await encryptJson(key, { token: VAULT_VERIFIER_PLAINTEXT }, keyVersion);

  return {
    key,
    meta: {
      salt,
      verifierCiphertext: verifier.ciphertext,
      verifierIv: verifier.iv,
      iterations,
      keyVersion,
    },
  };
}

export async function unlockVaultWithPassphrase(
  passphrase: string,
  meta: VaultMeta
): Promise<CryptoKey> {
  const key = await deriveAesKey(passphrase, meta.salt, meta.iterations);
  try {
    const verified = await decryptJson<{ token: string }>(key, {
      ciphertext: meta.verifierCiphertext,
      iv: meta.verifierIv,
    });
    if (verified.token !== VAULT_VERIFIER_PLAINTEXT) {
      throw new Error('Token di verifica non valido.');
    }
    return key;
  } catch {
    throw new Error('Passphrase errata: impossibile decifrare il vault.');
  }
}

export async function computeVaultFingerprint(meta: VaultMeta): Promise<string> {
  const subtle = getSubtle();
  const data = textEncoder.encode(`${meta.salt}:${meta.iterations}:v${meta.keyVersion}`);
  const digest = await subtle.digest('SHA-256', data as BufferSource);
  const bytes = new Uint8Array(digest).slice(0, 8);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(':');
}
