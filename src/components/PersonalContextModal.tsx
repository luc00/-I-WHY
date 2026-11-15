import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { PersonalContextProfile } from '../types/why';

interface PersonalContextModalProps {
  open: boolean;
  profile: PersonalContextProfile;
  isSaving: boolean;
  onClose: () => void;
  onSave: (profile: PersonalContextProfile) => Promise<void>;
}

export const PersonalContextModal: React.FC<PersonalContextModalProps> = ({
  open,
  profile,
  isSaving,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<PersonalContextProfile>(profile);

  useEffect(() => {
    setForm(profile);
  }, [profile, open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(form);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="context-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-xl rounded-2xl border border-[#E6E4DD] bg-white p-6 shadow-xl dark:border-[#2A3140] dark:bg-[#12161E]">
        <div className="flex items-start justify-between gap-4 border-b border-[#E6E4DD] pb-4 dark:border-[#1E232D]">
          <div>
            <h2
              id="context-modal-title"
              className="font-display text-xl font-semibold text-[#14171C] dark:text-[#F1F3F5]"
            >
              I Tuoi Dati e Contesto Personale
            </h2>
            <p className="mt-1 text-xs text-[#5C6470] dark:text-[#9CA3AF]">
              Salvato in forma crittografata nel tuo vault. Viene inviato all&apos;esecutore solo
              quando attivi l&apos;opzione di contesto personale.
            </p>
          </div>
          <button
            type="button"
            aria-label="Chiudi finestra contesto personale"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#5C6470] hover:bg-[#F2F0EB] hover:text-[#14171C] dark:text-[#9CA3AF] dark:hover:bg-[#1C222D]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="ctx-goals"
              className="block text-sm font-medium text-[#14171C] dark:text-[#E5E7EB]"
            >
              Obiettivi e direzione attuale
            </label>
            <textarea
              id="ctx-goals"
              rows={2}
              value={form.goals}
              onChange={(e) => setForm((p) => ({ ...p, goals: e.target.value }))}
              placeholder="Es. Migliorare la costanza nello studio, ridurre il sovraccarico lavorativo..."
              className="mt-1.5 w-full rounded-lg border border-[#D4D0C7] bg-[#F8F7F4] px-3 py-2 text-sm text-[#14171C] focus:border-[#1D4ED8] focus:bg-white focus:outline-none dark:border-[#2A3140] dark:bg-[#0B0D11] dark:text-[#F1F3F5]"
            />
          </div>

          <div>
            <label
              htmlFor="ctx-triggers"
              className="block text-sm font-medium text-[#14171C] dark:text-[#E5E7EB]"
            >
              Trigger e situazioni che ti mettono in difficoltà
            </label>
            <textarea
              id="ctx-triggers"
              rows={2}
              value={form.recurringTriggers}
              onChange={(e) => setForm((p) => ({ ...p, recurringTriggers: e.target.value }))}
              placeholder="Es. Scadenze ravvicinate, conflitti interpersonali, stanchezza serale..."
              className="mt-1.5 w-full rounded-lg border border-[#D4D0C7] bg-[#F8F7F4] px-3 py-2 text-sm text-[#14171C] focus:border-[#1D4ED8] focus:bg-white focus:outline-none dark:border-[#2A3140] dark:bg-[#0B0D11] dark:text-[#F1F3F5]"
            />
          </div>

          <div>
            <label
              htmlFor="ctx-routines"
              className="block text-sm font-medium text-[#14171C] dark:text-[#E5E7EB]"
            >
              Abitudini e ritmi quotidiani
            </label>
            <textarea
              id="ctx-routines"
              rows={2}
              value={form.dailyRoutines}
              onChange={(e) => setForm((p) => ({ ...p, dailyRoutines: e.target.value }))}
              placeholder="Es. Lavoro da remoto, picco di energia al mattino, uso frequente del telefono di notte..."
              className="mt-1.5 w-full rounded-lg border border-[#D4D0C7] bg-[#F8F7F4] px-3 py-2 text-sm text-[#14171C] focus:border-[#1D4ED8] focus:bg-white focus:outline-none dark:border-[#2A3140] dark:bg-[#0B0D11] dark:text-[#F1F3F5]"
            />
          </div>

          <div>
            <label
              htmlFor="ctx-values"
              className="block text-sm font-medium text-[#14171C] dark:text-[#E5E7EB]"
            >
              Valori personali fondamentali
            </label>
            <input
              id="ctx-values"
              type="text"
              value={form.values}
              onChange={(e) => setForm((p) => ({ ...p, values: e.target.value }))}
              placeholder="Es. Autenticità, autonomia, calma, crescita continua"
              className="mt-1.5 w-full rounded-lg border border-[#D4D0C7] bg-[#F8F7F4] px-3 py-2 text-sm text-[#14171C] focus:border-[#1D4ED8] focus:bg-white focus:outline-none dark:border-[#2A3140] dark:bg-[#0B0D11] dark:text-[#F1F3F5]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[#E6E4DD] pt-4 dark:border-[#1E232D]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#D4D0C7] px-4 py-2 text-sm font-medium text-[#14171C] hover:bg-[#F2F0EB] dark:border-[#2A3140] dark:text-[#F1F3F5] dark:hover:bg-[#1C222D]"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E40AF] disabled:opacity-50"
            >
              {isSaving ? 'Crittografia...' : 'Cifra e Salva Profilo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
