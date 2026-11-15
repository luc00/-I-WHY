import React, { useState } from 'react';
import {
  Check,
  Download,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { VAULT_LIMITS, VaultMeta, VaultNoteRecord } from '../types/why';

interface CryptoVaultViewProps {
  user: User | null;
  vaultMeta: VaultMeta | null;
  fingerprint: string;
  vaultUnlocked: boolean;
  notes: VaultNoteRecord[];
  localNotesCountToMigrate: number;
  onLockVault: () => void;
  onRotatePassphrase: (newPassphrase: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onMigrateLocalToCloud: () => Promise<number>;
}

export const CryptoVaultView: React.FC<CryptoVaultViewProps> = ({
  user,
  vaultMeta,
  fingerprint,
  vaultUnlocked,
  notes,
  localNotesCountToMigrate,
  onLockVault,
  onRotatePassphrase,
  onGoogleSignIn,
  onMigrateLocalToCloud,
}) => {
  const [selectedInspectId, setSelectedInspectId] = useState<string>('');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [rotateBusy, setRotateBusy] = useState(false);
  const [rotateStatus, setRotateStatus] = useState<string | null>(null);
  const [rotateError, setRotateError] = useState<string | null>(null);
  const [migrateStatus, setMigrateStatus] = useState<string | null>(null);
  const [migrateBusy, setMigrateBusy] = useState(false);

  const inspectedNote =
    notes.find((n) => n.id === selectedInspectId) ?? notes[0] ?? null;

  const handleRotate = async (e: React.FormEvent) => {
    e.preventDefault();
    setRotateError(null);
    setRotateStatus(null);

    if (newPassphrase.length < VAULT_LIMITS.MIN_PASSPHRASE_LENGTH) {
      setRotateError(
        `La nuova passphrase deve avere almeno ${VAULT_LIMITS.MIN_PASSPHRASE_LENGTH} caratteri.`
      );
      return;
    }
    if (newPassphrase !== confirmPassphrase) {
      setRotateError('Le due passphrase non coincidono.');
      return;
    }

    setRotateBusy(true);
    try {
      await onRotatePassphrase(newPassphrase);
      setNewPassphrase('');
      setConfirmPassphrase('');
      setRotateStatus('Chiave aggiornata e tutte le note sono state ri-cifrate con nuovo sale.');
    } catch (err) {
      setRotateError(
        err instanceof Error ? err.message : 'Impossibile ruotare la chiave del vault.'
      );
    } finally {
      setRotateBusy(false);
    }
  };

  const handleDownloadBackup = (encryptedOnly: boolean) => {
    const payload = encryptedOnly
      ? notes.map((n) => ({
          id: n.id,
          status: n.status,
          createdAtIso: n.createdAtIso,
          updatedAtIso: n.updatedAtIso,
          encrypted: n.encrypted,
        }))
      : notes.map((n) => ({
          id: n.id,
          status: n.status,
          createdAtIso: n.createdAtIso,
          decrypted: n.decrypted,
        }));

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = encryptedOnly
      ? `iwhy-backup-cifrato-${new Date().toISOString().slice(0, 10)}.json`
      : `iwhy-backup-in-chiaro-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleMigrate = async () => {
    setMigrateBusy(true);
    setMigrateStatus(null);
    try {
      const migrated = await onMigrateLocalToCloud();
      setMigrateStatus(`${migrated} note locali cifrate e sincronizzate su Cloud Firestore.`);
    } finally {
      setMigrateBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1040px] space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E4DD] pb-4 dark:border-[#1E232D]">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#14171C] dark:text-[#F1F3F5]">
            Crittografia Zero-Knowledge e Sincronizzazione
          </h1>
          <p className="mt-1 text-sm text-[#5C6470] dark:text-[#9CA3AF]">
            Ogni dato comportamentale viene cifrato nel browser prima di raggiungere il database.
          </p>
        </div>

        {vaultUnlocked && (
          <button
            type="button"
            onClick={onLockVault}
            className="inline-flex items-center gap-2 rounded-lg border border-[#D4D0C7] bg-white px-4 py-2 text-xs font-medium text-[#14171C] hover:bg-[#F2F0EB] dark:border-[#2A3140] dark:bg-[#141820] dark:text-[#F1F3F5]"
          >
            <Lock className="h-3.5 w-3.5" />
            Blocca Vault ora
          </button>
        )}
      </div>

      {/* Cryptographic Parameters Grid */}
      <section className="grid grid-cols-1 gap-4 rounded-2xl border border-[#E6E4DD] bg-white p-6 sm:grid-cols-4 dark:border-[#1E232D] dark:bg-[#12161E]">
        <div>
          <p className="text-xs text-[#5C6470] dark:text-[#9CA3AF]">Cifrario simmetrico</p>
          <p className="mt-1 font-mono text-sm font-semibold text-[#14171C] dark:text-[#F1F3F5]">
            AES-256-GCM
          </p>
        </div>
        <div>
          <p className="text-xs text-[#5C6470] dark:text-[#9CA3AF]">Derivazione chiave</p>
          <p className="mt-1 font-mono text-sm font-semibold text-[#14171C] tabular-nums dark:text-[#F1F3F5]">
            PBKDF2 ({(vaultMeta?.iterations ?? VAULT_LIMITS.PBKDF2_ITERATIONS).toLocaleString('it-IT')})
          </p>
        </div>
        <div>
          <p className="text-xs text-[#5C6470] dark:text-[#9CA3AF]">Impronta Vault (SHA-256)</p>
          <p className="mt-1 font-mono text-xs font-semibold text-[#1D4ED8] tabular-nums dark:text-[#60A5FA]">
            {fingerprint || 'Non inizializzato'}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#5C6470] dark:text-[#9CA3AF]">Stato sincronizzazione</p>
          <p className="mt-1 text-sm font-semibold text-[#15803D] dark:text-[#4ADE80]">
            {user ? 'Cloud Firestore Live' : 'Archivio Locale'}
          </p>
        </div>
      </section>

      {/* Cloud Sync & Migration Card */}
      <section className="rounded-2xl border border-[#E6E4DD] bg-white p-6 dark:border-[#1E232D] dark:bg-[#12161E]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[#14171C] dark:text-[#F1F3F5]">
              <ShieldCheck className="h-4 w-4 text-[#15803D] dark:text-[#4ADE80]" />
              Sincronizzazione in tempo reale tra dispositivi
            </h2>
            <p className="max-w-[65ch] text-xs text-[#5C6470] dark:text-[#9CA3AF]">
              {user
                ? `Connesso come ${user.email ?? user.displayName ?? 'Utente verificato'}. Le note cifrate si aggiornano istantaneamente su tutti i dispositivi in cui sblocchi il vault con la tua passphrase.`
                : 'Attualmente le note cifrate risiedono solo su questo browser. Accedi con Google per sincronizzarle in tempo reale su telefono, tablet e desktop.'}
            </p>
          </div>

          {!user ? (
            <button
              type="button"
              onClick={onGoogleSignIn}
              className="rounded-lg bg-[#1D4ED8] px-4 py-2 text-xs font-medium text-white hover:bg-[#1E40AF] whitespace-nowrap shrink-0"
            >
              Attiva Sync con Google
            </button>
          ) : (
            localNotesCountToMigrate > 0 &&
            vaultUnlocked && (
              <button
                type="button"
                disabled={migrateBusy}
                onClick={handleMigrate}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-4 py-2 text-xs font-medium text-white hover:bg-[#1E40AF] disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <UploadCloud className="h-4 w-4" />
                {migrateBusy
                  ? 'Sincronizzazione...'
                  : `Sincronizza ${localNotesCountToMigrate} note locali sul Cloud`}
              </button>
            )
          )}
        </div>

        {migrateStatus && (
          <p className="mt-3 text-xs font-medium text-[#15803D] dark:text-[#4ADE80]">
            {migrateStatus}
          </p>
        )}
      </section>

      {/* Zero-Knowledge Payload Inspector */}
      {vaultUnlocked && notes.length > 0 && inspectedNote && (
        <section className="space-y-4 rounded-2xl border border-[#E6E4DD] bg-white p-6 dark:border-[#1E232D] dark:bg-[#12161E]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-[#14171C] dark:text-[#F1F3F5]">
                Ispettore Crittografico Zero-Knowledge
              </h2>
              <p className="text-xs text-[#5C6470] dark:text-[#9CA3AF]">
                Confronta ciò che vedi in chiaro nella RAM del browser rispetto al payload reale
                memorizzato nel database.
              </p>
            </div>
            <select
              aria-label="Seleziona nota da ispezionare"
              value={inspectedNote.id}
              onChange={(e) => setSelectedInspectId(e.target.value)}
              className="max-w-xs rounded-lg border border-[#D4D0C7] bg-[#F8F7F4] px-3 py-1.5 text-xs text-[#14171C] dark:border-[#2A3140] dark:bg-[#0B0D11] dark:text-[#F1F3F5]"
            >
              {notes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.decrypted?.behaviorQuery.slice(0, 48) ?? n.id}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 divide-y divide-[#E6E4DD] overflow-hidden rounded-xl border border-[#E6E4DD] bg-[#F8F7F4] lg:grid-cols-2 lg:divide-x lg:divide-y-0 dark:divide-[#232936] dark:border-[#232936] dark:bg-[#0E1117]">
            <div className="p-4">
              <p className="text-xs font-semibold text-[#15803D] dark:text-[#4ADE80]">
                Vista decifrata (solo nella memoria locale)
              </p>
              <p className="mt-2 text-sm font-medium text-[#14171C] dark:text-[#F1F3F5]">
                {inspectedNote.decrypted?.behaviorQuery}
              </p>
              <p className="mt-1.5 text-xs text-[#4B5563] dark:text-[#B5BCC7]">
                {inspectedNote.decrypted?.coreMotive}
              </p>
            </div>

            <div className="p-4">
              <p className="text-xs font-semibold text-[#1D4ED8] dark:text-[#60A5FA]">
                Dato reale su Firestore / Storage (cifrato)
              </p>
              <p className="mt-2 font-mono text-[11px] text-[#5C6470] dark:text-[#9CA3AF]">
                IV (12 byte): {inspectedNote.encrypted.iv}
              </p>
              <pre className="mt-1.5 max-h-28 overflow-auto break-all whitespace-pre-wrap font-mono text-[11px] text-[#14171C] dark:text-[#CBD5E1]">
                {inspectedNote.encrypted.ciphertext}
              </pre>
            </div>
          </div>
        </section>
      )}

      {/* Key Rotation & Backup */}
      {vaultUnlocked && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleRotate}
            className="space-y-4 rounded-2xl border border-[#E6E4DD] bg-white p-6 dark:border-[#1E232D] dark:bg-[#12161E] lg:col-span-7"
          >
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[#14171C] dark:text-[#F1F3F5]">
              <KeyRound className="h-4 w-4 text-[#1D4ED8] dark:text-[#60A5FA]" />
              Cambia passphrase e ruota la chiave
            </h2>
            <p className="text-xs text-[#5C6470] dark:text-[#9CA3AF]">
              Genera un nuovo sale PBKDF2 e ri-cifra tutte le tue note esistenti con la nuova chiave
              AES-256-GCM.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="rotate-pass-1"
                  className="block text-xs font-medium text-[#374151] dark:text-[#CBD5E1]"
                >
                  Nuova passphrase
                </label>
                <input
                  id="rotate-pass-1"
                  type="password"
                  value={newPassphrase}
                  onChange={(e) => setNewPassphrase(e.target.value)}
                  placeholder="Minimo 6 caratteri"
                  className="mt-1 w-full rounded-lg border border-[#D4D0C7] bg-[#F8F7F4] px-3 py-2 text-sm text-[#14171C] dark:border-[#2A3140] dark:bg-[#0B0D11] dark:text-[#F1F3F5]"
                />
              </div>
              <div>
                <label
                  htmlFor="rotate-pass-2"
                  className="block text-xs font-medium text-[#374151] dark:text-[#CBD5E1]"
                >
                  Conferma nuova passphrase
                </label>
                <input
                  id="rotate-pass-2"
                  type="password"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  placeholder="Ripeti la frase"
                  className="mt-1 w-full rounded-lg border border-[#D4D0C7] bg-[#F8F7F4] px-3 py-2 text-sm text-[#14171C] dark:border-[#2A3140] dark:bg-[#0B0D11] dark:text-[#F1F3F5]"
                />
              </div>
            </div>

            {rotateError && (
              <p role="alert" className="text-xs text-red-700 dark:text-red-300">
                {rotateError}
              </p>
            )}
            {rotateStatus && (
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15803D] dark:text-[#4ADE80]">
                <Check className="h-4 w-4" />
                {rotateStatus}
              </p>
            )}

            <button
              type="submit"
              disabled={rotateBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-[#14171C] px-4 py-2 text-xs font-medium text-white hover:bg-[#272D38] disabled:opacity-50 dark:bg-[#F1F3F5] dark:text-[#0B0D11]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {rotateBusy ? 'Ri-cifratura in corso...' : 'Aggiorna chiave e ri-cifra vault'}
            </button>
          </form>

          <div className="flex flex-col justify-between space-y-4 rounded-2xl border border-[#E6E4DD] bg-white p-6 dark:border-[#1E232D] dark:bg-[#12161E] lg:col-span-5">
            <div>
              <h2 className="text-sm font-semibold text-[#14171C] dark:text-[#F1F3F5]">
                Esportazione e Backup
              </h2>
              <p className="mt-1 text-xs text-[#5C6470] dark:text-[#9CA3AF]">
                Scarica una copia delle tue note per archivio personale.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                disabled={notes.length === 0}
                onClick={() => handleDownloadBackup(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#D4D0C7] bg-[#F8F7F4] px-4 py-2.5 text-xs font-medium text-[#14171C] hover:bg-[#EBE8E0] disabled:opacity-40 dark:border-[#2A3140] dark:bg-[#0B0D11] dark:text-[#F1F3F5]"
              >
                <Download className="h-4 w-4" />
                Esporta archivio cifrato (JSON)
              </button>
              <button
                type="button"
                disabled={notes.length === 0}
                onClick={() => handleDownloadBackup(false)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#D4D0C7] bg-white px-4 py-2.5 text-xs font-medium text-[#14171C] hover:bg-[#F2F0EB] disabled:opacity-40 dark:border-[#2A3140] dark:bg-[#141820] dark:text-[#F1F3F5]"
              >
                <Download className="h-4 w-4" />
                Esporta testo decifrato (JSON)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
