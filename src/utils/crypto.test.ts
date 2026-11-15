import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeVaultFingerprint,
  createVaultCredentials,
  decryptJson,
  encryptJson,
  unlockVaultWithPassphrase,
} from './crypto';

test('AES-256-GCM encryptJson and decryptJson roundtrip preserves nested behavioral note', async () => {
  const { key, meta } = await createVaultCredentials('segreto-personale-2026');
  const payload = {
    behaviorQuery: 'Perché rimando i compiti importanti?',
    coreMotive: 'Evitamento della valutazione negativa.',
    reflectionPrompts: ['Cosa temo accada?', 'Qual è il primo passo minimo?'],
    emotionalIntensity: 4,
  };

  const encrypted = await encryptJson(key, payload);
  assert.ok(encrypted.ciphertext.length >= 16);
  assert.ok(encrypted.iv.length >= 12);
  assert.equal(encrypted.keyVersion, 1);

  // Zero-knowledge check: plaintext substrings must never appear in ciphertext
  assert.equal(encrypted.ciphertext.includes('compiti'), false);
  assert.equal(encrypted.ciphertext.includes('Evitamento'), false);

  const decrypted = await decryptJson<typeof payload>(key, encrypted);
  assert.deepEqual(decrypted, payload);

  // Unlocking from metadata with same passphrase yields equivalent key
  const unlockedKey = await unlockVaultWithPassphrase('segreto-personale-2026', meta);
  const decryptedWithUnlocked = await decryptJson<typeof payload>(unlockedKey, encrypted);
  assert.deepEqual(decryptedWithUnlocked, payload);
});

test('encryptJson generates unique random IVs for identical plaintexts', async () => {
  const { key } = await createVaultCredentials('passphrase-lunga-sicura');
  const first = await encryptJson(key, { text: 'stesso testo' });
  const second = await encryptJson(key, { text: 'stesso testo' });

  assert.notEqual(first.iv, second.iv);
  assert.notEqual(first.ciphertext, second.ciphertext);
});

test('unlockVaultWithPassphrase rejects wrong passphrase and short passphrases', async () => {
  const { meta } = await createVaultCredentials('chiave-corretta-123');

  await assert.rejects(
    () => unlockVaultWithPassphrase('chiave-sbagliata-999', meta),
    /Passphrase errata/
  );

  await assert.rejects(
    () => createVaultCredentials('123'),
    /almeno 6 caratteri/
  );
});

test('decryptJson rejects tampered ciphertext (GCM authentication tag integrity)', async () => {
  const { key } = await createVaultCredentials('integrita-gcm-test');
  const encrypted = await encryptJson(key, { note: 'dato sensibile' });

  const tamperedCipher =
    (encrypted.ciphertext[0] === 'A' ? 'B' : 'A') + encrypted.ciphertext.slice(1);

  await assert.rejects(() =>
    decryptJson(key, { ciphertext: tamperedCipher, iv: encrypted.iv })
  );
});

test('computeVaultFingerprint produces deterministic colon-separated hex digest', async () => {
  const { meta } = await createVaultCredentials('fingerprint-test-key');
  const fp1 = await computeVaultFingerprint(meta);
  const fp2 = await computeVaultFingerprint(meta);

  assert.equal(fp1, fp2);
  assert.match(fp1, /^([0-9A-F]{2}:){7}[0-9A-F]{2}$/);
});
