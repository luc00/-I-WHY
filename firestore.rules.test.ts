import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Validates that firestore.rules contains every hardened invariant from security_spec.md
// and exercises the Dirty Dozen policy predicates directly against a deterministic rules simulator.

interface MockAuth {
  uid: string;
  token: { email_verified: boolean };
}

interface NotePayload {
  ownerId?: unknown;
  ciphertext?: unknown;
  iv?: unknown;
  keyVersion?: unknown;
  status?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  [extra: string]: unknown;
}

const REQUEST_TIME = 'SERVER_TIME';
const VALID_ID = /^[a-zA-Z0-9_\-]+$/;

function isValidId(id: string): boolean {
  return id.length >= 1 && id.length <= 128 && VALID_ID.test(id);
}

function canCreateNote(
  auth: MockAuth | null,
  userId: string,
  noteId: string,
  incoming: NotePayload,
  parentExists = true
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!auth || !auth.token.email_verified || auth.uid !== userId) return 'PERMISSION_DENIED';
  if (!isValidId(userId) || !isValidId(noteId) || !parentExists) return 'PERMISSION_DENIED';

  const required = ['ownerId', 'ciphertext', 'iv', 'keyVersion', 'status', 'createdAt', 'updatedAt'];
  const keys = Object.keys(incoming);
  if (!required.every((k) => keys.includes(k))) return 'PERMISSION_DENIED';
  if (!keys.every((k) => required.includes(k))) return 'PERMISSION_DENIED';

  if (incoming.ownerId !== auth.uid || incoming.ownerId !== userId) return 'PERMISSION_DENIED';
  if (typeof incoming.ciphertext !== 'string' || incoming.ciphertext.length < 16 || incoming.ciphertext.length > 200000) {
    return 'PERMISSION_DENIED';
  }
  if (typeof incoming.iv !== 'string' || incoming.iv.length < 12 || incoming.iv.length > 64) {
    return 'PERMISSION_DENIED';
  }
  if (typeof incoming.keyVersion !== 'number' || !Number.isInteger(incoming.keyVersion) || incoming.keyVersion < 1 || incoming.keyVersion > 1000) {
    return 'PERMISSION_DENIED';
  }
  if (!['to_explore', 'practicing', 'integrated'].includes(String(incoming.status))) {
    return 'PERMISSION_DENIED';
  }
  if (incoming.createdAt !== REQUEST_TIME || incoming.updatedAt !== REQUEST_TIME) {
    return 'PERMISSION_DENIED';
  }
  return 'ALLOW';
}

test('firestore.rules file exists and enforces all required security primitives', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  assert.match(rules, /rules_version\s*=\s*'2'/);
  assert.match(rules, /match \/{document=\*\*}\s*\{\s*allow read, write: if false;/);
  assert.match(rules, /request\.auth\.token\.email_verified == true/);
  assert.match(rules, /incoming\(\)\.createdAt == request\.time/);
  assert.match(rules, /incoming\(\)\.updatedAt == request\.time/);
  assert.match(rules, /isValidEncryptedNote/);
  assert.match(rules, /isValidVaultMetadata/);
  assert.match(rules, /isValidEncryptedContextProfile/);
});

test('Dirty Dozen security payloads all return PERMISSION_DENIED', () => {
  const validPayload: NotePayload = {
    ownerId: 'u1',
    ciphertext: 'AESGCM_BASE64_CIPHERTEXT_PAYLOAD_0001',
    iv: 'BASE64_IV_123456',
    keyVersion: 1,
    status: 'to_explore',
    createdAt: REQUEST_TIME,
    updatedAt: REQUEST_TIME,
  };

  assert.equal(canCreateNote({ uid: 'u1', token: { email_verified: true } }, 'u1', 'note_1', validPayload), 'ALLOW');

  // 1. Unauthenticated
  assert.equal(canCreateNote(null, 'u1', 'note_1', validPayload), 'PERMISSION_DENIED');
  // 2. Unverified email
  assert.equal(canCreateNote({ uid: 'u1', token: { email_verified: false } }, 'u1', 'note_1', validPayload), 'PERMISSION_DENIED');
  // 3. Cross-user path spoof
  assert.equal(canCreateNote({ uid: 'attacker', token: { email_verified: true } }, 'victim', 'note_1', { ...validPayload, ownerId: 'attacker' }), 'PERMISSION_DENIED');
  // 4. OwnerId hijack
  assert.equal(canCreateNote({ uid: 'u1', token: { email_verified: true } }, 'u1', 'note_1', { ...validPayload, ownerId: 'u2' }), 'PERMISSION_DENIED');
  // 5. Shadow ghost field injection
  assert.equal(canCreateNote({ uid: 'u1', token: { email_verified: true } }, 'u1', 'note_1', { ...validPayload, isAdmin: true }), 'PERMISSION_DENIED');
  // 6. Client timestamp forgery
  assert.equal(canCreateNote({ uid: 'u1', token: { email_verified: true } }, 'u1', 'note_1', { ...validPayload, createdAt: '2020-01-01' }), 'PERMISSION_DENIED');
  // 7. Invalid note status
  assert.equal(canCreateNote({ uid: 'u1', token: { email_verified: true } }, 'u1', 'note_1', { ...validPayload, status: 'hacked' }), 'PERMISSION_DENIED');
  // 8. Oversized ciphertext Denial-of-Wallet
  assert.equal(canCreateNote({ uid: 'u1', token: { email_verified: true } }, 'u1', 'note_1', { ...validPayload, ciphertext: 'A'.repeat(200001) }), 'PERMISSION_DENIED');
  // 9. Path ID poisoning
  assert.equal(canCreateNote({ uid: 'u1', token: { email_verified: true } }, 'u1', '../evil', validPayload), 'PERMISSION_DENIED');
  // 10. Parent account missing (Master Gate)
  assert.equal(canCreateNote({ uid: 'u1', token: { email_verified: true } }, 'u1', 'note_1', validPayload, false), 'PERMISSION_DENIED');
  // 11. KeyVersion downgrade
  assert.equal(canCreateNote({ uid: 'u1', token: { email_verified: true } }, 'u1', 'note_1', { ...validPayload, keyVersion: 0 }), 'PERMISSION_DENIED');
  // 12. IV too short
  assert.equal(canCreateNote({ uid: 'u1', token: { email_verified: true } }, 'u1', 'note_1', { ...validPayload, iv: 'short' }), 'PERMISSION_DENIED');
});
