import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { User } from 'firebase/auth';
import { VAULT_LIMITS } from '../types/why';
import editorialIllustration from '../assets/images/editorial_mind_labyrinth_1794746526499.jpg';

interface VaultGateProps {
  user: User | null;
  hasExistingVault: boolean;
  isBusy: boolean;
  error: string | null;
  onCreateVault: (passphrase: string) => Promise<void>;
  onUnlockVault: (passphrase: string) => Promise<void>;
  onQuickLocalStart: () => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  embeddedInSheet?: boolean;
}

export const VaultGate: React.FC<VaultGateProps> = ({
  user,
  hasExistingVault,
  isBusy,
  error,
  onCreateVault,
  onUnlockVault,
  onQuickLocalStart,
  onGoogleSignIn,
  embeddedInSheet = false,
}) => {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [localValidation, setLocalValidation] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalValidation(null);

    if (passphrase.length < VAULT_LIMITS.MIN_PASSPHRASE_LENGTH) {
      setLocalValidation(
        `Inserisci una passphrase di almeno ${VAULT_LIMITS.MIN_PASSPHRASE_LENGTH} caratteri.`
      );
      return;
    }

    if (!hasExistingVault && passphrase !== confirmPassphrase) {
      setLocalValidation('Le due passphrase non coincidono.');
      return;
    }

    if (hasExistingVault) {
      await onUnlockVault(passphrase);
    } else {
      await onCreateVault(passphrase);
    }
  };

  const HeadingTag = embeddedInSheet ? 'h2' : 'h1';

  return (
    <section
      className={
        embeddedInSheet
          ? 'w-full'
          : 'mx-auto max-w-[1160px] px-4 py-10 sm:px-6 lg:py-16'
      }
    >
      <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
        {/* Left editorial column */}
        <div
          className={
            embeddedInSheet
              ? 'flex flex-col justify-between lg:col-span-7'
              : 'flex flex-col justify-between rounded-2xl border border-[#E6E4DD] bg-white p-7 sm:p-10 dark:border-[#1E232D] dark:bg-[#12161E] lg:col-span-7'
          }
        >
          <div>
            <p className="text-xs font-medium tracking-wide text-[#5C6470] dark:text-[#9CA3AF]">
              Esecutore Comportamentale · Crittografia Zero-Knowledge AES-256-GCM
            </p>
            <HeadingTag className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#14171C] sm:text-4xl dark:text-[#F1F3F5] [text-wrap:balance]">
              Comprendi il perché delle tue azioni, in uno spazio solo tuo.
            </HeadingTag>
            <p className="mt-4 max-w-[60ch] text-[15px] leading-relaxed text-[#4B5563] dark:text-[#B5BCC7]">
              [I] WHY combina ricerca psicologica dal web, analisi dei tuoi dati personali e note
              private cifrate sul dispositivo prima della sincronizzazione in tempo reale.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="vault-passphrase"
                  className="block text-sm font-medium text-[#14171C] dark:text-[#E5E7EB]"
                >
                  {hasExistingVault
                    ? user
                      ? 'Sblocca il tuo Vault Cloud personale'
                      : 'Sblocca il Vault Locale crittografato'
                    : user
                    ? 'Crea la chiave segreta del tuo Vault Cloud'
                    : 'Crea una chiave segreta per il tuo Vault privato'}
                </label>
                <div className="relative mt-2">
                  <input
                    id="vault-passphrase"
                    type={showPassphrase ? 'text' : 'password'}
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Almeno 6 caratteri (es. frase segreta personale)"
                    autoComplete={hasExistingVault ? 'current-password' : 'new-password'}
                    className="w-full rounded-lg border border-[#D4D0C7] bg-[#F8F7F4] py-2.5 pl-4 pr-11 text-sm text-[#14171C] placeholder:text-[#88909B] focus:border-[#1D4ED8] focus:bg-white focus:outline-none dark:border-[#2A3140] dark:bg-[#0B0D11] dark:text-[#F1F3F5] dark:focus:border-[#60A5FA]"
                  />
                  <button
                    type="button"
                    aria-label={showPassphrase ? 'Nascondi passphrase' : 'Mostra passphrase'}
                    onClick={() => setShowPassphrase((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#5C6470] hover:text-[#14171C] dark:text-[#9CA3AF] dark:hover:text-white"
                  >
                    {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {!hasExistingVault && (
                <div>
                  <label
                    htmlFor="vault-passphrase-confirm"
                    className="block text-sm font-medium text-[#14171C] dark:text-[#E5E7EB]"
                  >
                    Conferma la chiave segreta
                  </label>
                  <input
                    id="vault-passphrase-confirm"
                    type={showPassphrase ? 'text' : 'password'}
                    value={confirmPassphrase}
                    onChange={(e) => setConfirmPassphrase(e.target.value)}
                    placeholder="Ripeti la frase segreta"
                    autoComplete="new-password"
                    className="mt-2 w-full rounded-lg border border-[#D4D0C7] bg-[#F8F7F4] px-4 py-2.5 text-sm text-[#14171C] placeholder:text-[#88909B] focus:border-[#1D4ED8] focus:bg-white focus:outline-none dark:border-[#2A3140] dark:bg-[#0B0D11] dark:text-[#F1F3F5] dark:focus:border-[#60A5FA]"
                  />
                </div>
              )}

              {(localValidation || error) && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
                >
                  {localValidation || error}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isBusy}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1E40AF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {hasExistingVault ? (
                    <>
                      <KeyRound className="h-4 w-4" />
                      {isBusy ? 'Decifratura...' : 'Sblocca Vault'}
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      {isBusy ? 'Generazione chiave...' : 'Crea Vault Crittografato'}
                    </>
                  )}
                </button>

                {!user && !hasExistingVault && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={onQuickLocalStart}
                    className="rounded-lg border border-[#D4D0C7] bg-white px-4 py-2.5 text-sm font-medium text-[#14171C] transition-colors hover:bg-[#F2F0EB] disabled:opacity-50 dark:border-[#2A3140] dark:bg-[#141820] dark:text-[#F1F3F5] dark:hover:bg-[#1C222D] whitespace-nowrap shrink-0"
                  >
                    Inizia in modalità locale rapida
                  </button>
                )}

                {!user && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={onGoogleSignIn}
                    className="px-3 py-2 text-sm font-medium text-[#1D4ED8] underline underline-offset-4 hover:text-[#1E40AF] dark:text-[#60A5FA] whitespace-nowrap shrink-0"
                  >
                    Oppure sincronizza con Google
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="mt-8 border-t border-[#E6E4DD] pt-5 text-xs text-[#5C6470] dark:border-[#1E232D] dark:text-[#9CA3AF]">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#15803D] dark:text-[#4ADE80]" />
              <span>
                La tua passphrase non lascia mai il browser. Deriviamo la chiave AES-256-GCM tramite
                PBKDF2-SHA256 (250.000 iterazioni) e cifriamo ogni nota prima del salvataggio.
              </span>
            </div>
          </div>
        </div>

        {/* Right visual column matching height */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-[#E6E4DD] bg-[#F5F2EA] dark:border-[#1E232D] dark:bg-[#12161E] lg:col-span-5">
          {!imgFailed ? (
            <img
              src={editorialIllustration}
              alt="Illustrazione architettonica minimalista che rappresenta la chiarezza interiore"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="h-64 w-full scale-[1.04] object-cover lg:h-full"
            />
          ) : (
            <div className="flex h-64 w-full flex-col items-center justify-center bg-[#EBE8E0] p-8 text-center lg:h-full dark:bg-[#161B24]">
              <Lock className="h-10 w-10 text-[#1D4ED8] dark:text-[#60A5FA]" />
              <p className="mt-4 font-display text-lg font-medium text-[#14171C] dark:text-[#F1F3F5]">
                Archivio Mentale Privato
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
