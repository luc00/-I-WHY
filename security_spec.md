# Security Specification — `[I] WHY` Zero-Knowledge Vault

## 1. Data Invariants
1. **Strict Ownership Isolation**: Every document under `/users/{userId}`, `/users/{userId}/vault/{vaultDocId}`, `/users/{userId}/notes/{noteId}`, and `/users/{userId}/context/{contextDocId}` belongs strictly to `userId`. Only the authenticated, email-verified user whose `request.auth.uid == userId` can read, list, create, update, or delete their own records.
2. **Zero-Knowledge Payload Integrity**: Notes and personal context profiles MUST NEVER store plaintext fields on Firestore; they store bounded `ciphertext` (`16..200000` chars for notes, `16..50000` chars for context), `iv` (`12..64` chars), and integer `keyVersion` (`>= 1`).
3. **Immutable Ownership & Creation Time**: `ownerId` and `createdAt` cannot be modified after creation.
4. **Server-Side Temporal Integrity**: `createdAt` (on create) and `updatedAt` (on create and update) MUST equal `request.time`.
5. **Path Variable & Field Bounding**: All IDs (`userId`, `vaultDocId`, `noteId`, `contextDocId`) must match `^[a-zA-Z0-9_\-]+$` and stay `<= 128` characters.

## 2. The "Dirty Dozen" Attack Payloads
1. **Unauthenticated Note Read**: `auth = null` attempting `get /users/u1/notes/n1` -> `PERMISSION_DENIED`.
2. **Unverified Email Write**: `auth = { uid: 'u1', token: { email_verified: false } }` creating note -> `PERMISSION_DENIED`.
3. **Cross-User Note Spoof (Path vs Auth)**: `auth.uid = 'attacker'` creating `/users/victim/notes/n1` with `ownerId: 'attacker'` -> `PERMISSION_DENIED`.
4. **OwnerId Hijack**: `auth.uid = 'u1'` creating `/users/u1/notes/n1` with `ownerId: 'u2'` -> `PERMISSION_DENIED`.
5. **Shadow Ghost Field Injection**: `auth.uid = 'u1'` creating note with extra field `isAdmin: true` -> `PERMISSION_DENIED`.
6. **Client Timestamp Forgery**: `auth.uid = 'u1'` creating note with `createdAt: '2020-01-01'` instead of `request.time` -> `PERMISSION_DENIED`.
7. **Immutable Field Tampering on Update**: `auth.uid = 'u1'` updating note and mutating `ownerId` or `createdAt` -> `PERMISSION_DENIED`.
8. **Invalid Note Status Enum**: `auth.uid = 'u1'` creating or updating note with `status: 'hacked'` -> `PERMISSION_DENIED`.
9. **Denial-of-Wallet Oversized Ciphertext**: `auth.uid = 'u1'` creating note with `ciphertext.size() > 200000` -> `PERMISSION_DENIED`.
10. **Path ID Poisoning**: `auth.uid = 'u1'` creating `/users/u1/notes/../../evil` or 200-char ID -> `PERMISSION_DENIED`.
11. **Vault KeyVersion Downgrade**: `auth.uid = 'u1'` updating vault meta with `keyVersion: 0` or negative `iterations` -> `PERMISSION_DENIED`.
12. **Blanket List Scraping**: `auth.uid = 'attacker'` running `list` on `/users/victim/notes` -> `PERMISSION_DENIED`.
