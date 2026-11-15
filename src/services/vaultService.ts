import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  DecryptedNotePayload,
  EncryptedPayload,
  NoteStatus,
  PersonalContextProfile,
  VAULT_LIMITS,
  VaultMeta,
  VaultNoteRecord,
} from '../types/why';
import { decryptJson, encryptJson } from '../utils/crypto';

export interface CloudEncryptedNoteDoc {
  id: string;
  ownerId: string;
  ciphertext: string;
  iv: string;
  keyVersion: number;
  status: NoteStatus;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface SyncStatusMeta {
  fromCache: boolean;
  hasPendingWrites: boolean;
  lastSyncedIso: string;
}

function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

export function generateSafeId(prefix = 'why'): string {
  const randomBytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(randomBytes);
  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${prefix}_${Date.now()}_${hex}`;
}

// ==========================================
// CLOUD FIRESTORE E2EE OPERATIONS
// ==========================================

export async function ensureCloudUserAccount(uid: string, displayLabel: string): Promise<void> {
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);
  try {
    const snap = await getDoc(userRef);
    const safeLabel = (displayLabel || 'Utente Privato').trim().slice(0, 120) || 'Utente Privato';
    if (!snap.exists()) {
      await setDoc(userRef, {
        ownerId: uid,
        displayLabel: safeLabel,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function fetchCloudVaultMeta(uid: string): Promise<VaultMeta | null> {
  const metaPath = `users/${uid}/vault/meta`;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'vault', 'meta'));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      salt: String(data.salt),
      verifierCiphertext: String(data.verifierCiphertext),
      verifierIv: String(data.verifierIv),
      iterations: Number(data.iterations),
      keyVersion: Number(data.keyVersion),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, metaPath);
  }
}

export async function saveCloudVaultMeta(
  uid: string,
  meta: VaultMeta,
  isUpdate: boolean
): Promise<void> {
  const metaPath = `users/${uid}/vault/meta`;
  const metaRef = doc(db, 'users', uid, 'vault', 'meta');
  try {
    if (isUpdate) {
      await updateDoc(metaRef, {
        salt: meta.salt,
        verifierCiphertext: meta.verifierCiphertext,
        verifierIv: meta.verifierIv,
        iterations: meta.iterations,
        keyVersion: meta.keyVersion,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(metaRef, {
        ownerId: uid,
        salt: meta.salt,
        verifierCiphertext: meta.verifierCiphertext,
        verifierIv: meta.verifierIv,
        iterations: meta.iterations,
        keyVersion: meta.keyVersion,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isUpdate ? OperationType.UPDATE : OperationType.CREATE, metaPath);
  }
}

export function subscribeCloudEncryptedNotes(
  uid: string,
  onNotes: (docs: CloudEncryptedNoteDoc[], syncMeta: SyncStatusMeta) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const notesPath = `users/${uid}/notes`;
  const q = query(collection(db, 'users', uid, 'notes'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const docs: CloudEncryptedNoteDoc[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ownerId: String(data.ownerId ?? uid),
          ciphertext: String(data.ciphertext ?? ''),
          iv: String(data.iv ?? ''),
          keyVersion: Number(data.keyVersion ?? 1),
          status: (data.status as NoteStatus) ?? 'to_explore',
          createdAtIso: timestampToIso(data.createdAt),
          updatedAtIso: timestampToIso(data.updatedAt),
        };
      });
      onNotes(docs, {
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
        lastSyncedIso: new Date().toISOString(),
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, notesPath);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function createCloudEncryptedNote(
  uid: string,
  noteId: string,
  status: NoteStatus,
  encrypted: EncryptedPayload
): Promise<void> {
  const notePath = `users/${uid}/notes/${noteId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'notes', noteId), {
      ownerId: uid,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      keyVersion: encrypted.keyVersion,
      status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, notePath);
  }
}

export async function updateCloudEncryptedNote(
  uid: string,
  noteId: string,
  status: NoteStatus,
  encrypted: EncryptedPayload
): Promise<void> {
  const notePath = `users/${uid}/notes/${noteId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'notes', noteId), {
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      keyVersion: encrypted.keyVersion,
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, notePath);
  }
}

export async function updateCloudNoteStatus(
  uid: string,
  noteId: string,
  status: NoteStatus
): Promise<void> {
  const notePath = `users/${uid}/notes/${noteId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'notes', noteId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, notePath);
  }
}

export async function deleteCloudEncryptedNote(uid: string, noteId: string): Promise<void> {
  const notePath = `users/${uid}/notes/${noteId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'notes', noteId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, notePath);
  }
}

export async function fetchCloudContextProfile(
  uid: string,
  key: CryptoKey
): Promise<PersonalContextProfile | null> {
  const path = `users/${uid}/context/profile`;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'context', 'profile'));
    if (!snap.exists()) return null;
    const data = snap.data();
    return await decryptJson<PersonalContextProfile>(key, {
      ciphertext: String(data.ciphertext),
      iv: String(data.iv),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.GET, path);
    }
    return null;
  }
}

export async function saveCloudContextProfile(
  uid: string,
  key: CryptoKey,
  profile: PersonalContextProfile
): Promise<void> {
  const path = `users/${uid}/context/profile`;
  const encrypted = await encryptJson(key, profile, VAULT_LIMITS.KEY_VERSION);
  if (encrypted.ciphertext.length > VAULT_LIMITS.MAX_CONTEXT_CIPHERTEXT_LENGTH) {
    throw new Error('Profilo personale troppo lungo per il salvataggio crittografato.');
  }
  try {
    const ref = doc(db, 'users', uid, 'context', 'profile');
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      await updateDoc(ref, {
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        keyVersion: encrypted.keyVersion,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ownerId: uid,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        keyVersion: encrypted.keyVersion,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// LOCAL ENCRYPTED STORAGE FALLBACK (OFFLINE / NO-AUTH MODE)
// ==========================================

const LOCAL_META_KEY = 'iwhy_local_vault_meta_v1';
const LOCAL_NOTES_KEY = 'iwhy_local_vault_notes_v1';
const LOCAL_CONTEXT_KEY = 'iwhy_local_vault_context_v1';

export function loadLocalVaultMeta(): VaultMeta | null {
  try {
    const raw = localStorage.getItem(LOCAL_META_KEY);
    return raw ? (JSON.parse(raw) as VaultMeta) : null;
  } catch {
    return null;
  }
}

export function saveLocalVaultMeta(meta: VaultMeta): void {
  localStorage.setItem(LOCAL_META_KEY, JSON.stringify(meta));
}

export function loadLocalEncryptedNotes(): CloudEncryptedNoteDoc[] {
  try {
    const raw = localStorage.getItem(LOCAL_NOTES_KEY);
    return raw ? (JSON.parse(raw) as CloudEncryptedNoteDoc[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalEncryptedNotes(notes: CloudEncryptedNoteDoc[]): void {
  localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(notes));
}

export async function loadLocalContextProfile(
  key: CryptoKey
): Promise<PersonalContextProfile | null> {
  try {
    const raw = localStorage.getItem(LOCAL_CONTEXT_KEY);
    if (!raw) return null;
    const encrypted = JSON.parse(raw) as EncryptedPayload;
    return await decryptJson<PersonalContextProfile>(key, encrypted);
  } catch {
    return null;
  }
}

export async function saveLocalContextProfile(
  key: CryptoKey,
  profile: PersonalContextProfile
): Promise<void> {
  const encrypted = await encryptJson(key, profile, VAULT_LIMITS.KEY_VERSION);
  localStorage.setItem(LOCAL_CONTEXT_KEY, JSON.stringify(encrypted));
}

export async function decryptNoteDocs(
  docs: CloudEncryptedNoteDoc[],
  key: CryptoKey
): Promise<VaultNoteRecord[]> {
  return Promise.all(
    docs.map(async (item) => {
      try {
        const decrypted = await decryptJson<DecryptedNotePayload>(key, {
          ciphertext: item.ciphertext,
          iv: item.iv,
        });
        return {
          id: item.id,
          status: item.status,
          createdAtIso: item.createdAtIso,
          updatedAtIso: item.updatedAtIso,
          encrypted: {
            ciphertext: item.ciphertext,
            iv: item.iv,
            keyVersion: item.keyVersion,
          },
          decrypted,
        };
      } catch {
        return {
          id: item.id,
          status: item.status,
          createdAtIso: item.createdAtIso,
          updatedAtIso: item.updatedAtIso,
          encrypted: {
            ciphertext: item.ciphertext,
            iv: item.iv,
            keyVersion: item.keyVersion,
          },
          decrypted: null,
        };
      }
    })
  );
}
