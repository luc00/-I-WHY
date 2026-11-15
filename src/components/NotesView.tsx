import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ExternalLink,
  FilePlus2,
  Lock,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  DecryptedNotePayload,
  NoteStatus,
  PatternCategory,
  VaultNoteRecord,
} from '../types/why';

interface NotesViewProps {
  notes: VaultNoteRecord[];
  selectedNoteId: string | null;
  onSelectNote: (id: string | null) => void;
  onUpdateNote: (
    noteId: string,
    status: NoteStatus,
    updatedPayload: DecryptedNotePayload
  ) => Promise<void>;
  onCreateManualNote: (params: {
    behaviorQuery: string;
    coreMotive: string;
    personalReflection: string;
    patternCategory: PatternCategory;
    emotionalIntensity: number;
  }) => Promise<string>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onSeedSampleNotes: () => Promise<void>;
  onGoToExecutor: () => void;
  isCloudSynced: boolean;
  lastSyncedIso: string | null;
}

const STATUS_LABELS: Record<NoteStatus, string> = {
  to_explore: 'Da esplorare',
  practicing: 'In pratica',
  integrated: 'Integrato',
};

const PATTERN_OPTIONS: PatternCategory[] = [
  'Evitamento Emotivo',
  'Ricerca di Approvazione',
  'Sovraccarico Cognitivo',
  'Abitudine Automatica',
  'Bisogno di Controllo',
  'Paura del Fallimento',
  'Regolazione Emotiva',
  'Altro',
];

function formatDateIt(iso: string): string {
  try {
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export const NotesView: React.FC<NotesViewProps> = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onUpdateNote,
  onCreateManualNote,
  onDeleteNote,
  onSeedSampleNotes,
  onGoToExecutor,
  isCloudSynced,
  lastSyncedIso,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | NoteStatus>('all');
  const [showManualForm, setShowManualForm] = useState(false);

  // Manual note form state
  const [manualQuery, setManualQuery] = useState('');
  const [manualMotive, setManualMotive] = useState('');
  const [manualReflection, setManualReflection] = useState('');
  const [manualPattern, setManualPattern] = useState<PatternCategory>('Evitamento Emotivo');
  const [manualIntensity, setManualIntensity] = useState(3);
  const [manualBusy, setManualBusy] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Selected note editor state
  const activeNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) ?? notes[0] ?? null,
    [notes, selectedNoteId]
  );

  const [editReflection, setEditReflection] = useState('');
  const [editStatus, setEditStatus] = useState<NoteStatus>('to_explore');
  const [editIntensity, setEditIntensity] = useState(3);
  const [savingEdit, setSavingEdit] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [seedingBusy, setSeedingBusy] = useState(false);

  useEffect(() => {
    if (activeNote?.decrypted) {
      setEditReflection(activeNote.decrypted.personalReflection);
      setEditStatus(activeNote.status);
      setEditIntensity(activeNote.decrypted.emotionalIntensity || 3);
      setSaveFeedback(null);
      setConfirmDeleteId(null);
    }
  }, [activeNote?.id]);

  const filteredNotes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return notes.filter((n) => {
      if (statusFilter !== 'all' && n.status !== statusFilter) return false;
      if (!q) return true;
      if (!n.decrypted) return false;
      return (
        n.decrypted.behaviorQuery.toLowerCase().includes(q) ||
        n.decrypted.coreMotive.toLowerCase().includes(q) ||
        n.decrypted.personalReflection.toLowerCase().includes(q) ||
        n.decrypted.patternCategory.toLowerCase().includes(q)
      );
    });
  }, [notes, searchTerm, statusFilter]);

  const handleSaveChanges = async () => {
    if (!activeNote?.decrypted) return;
    setSavingEdit(true);
    setSaveFeedback(null);
    try {
      const updatedPayload: DecryptedNotePayload = {
        ...activeNote.decrypted,
        personalReflection: editReflection,
        emotionalIntensity: editIntensity,
        updatedAtIso: new Date().toISOString(),
      };
      await onUpdateNote(activeNote.id, editStatus, updatedPayload);
      setSaveFeedback('Modifiche cifrate e salvate.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);
    if (manualQuery.trim().length < 4) {
      setManualError('Inserisci almeno 4 caratteri per descrivere il comportamento.');
      return;
    }
    setManualBusy(true);
    try {
      const id = await onCreateManualNote({
        behaviorQuery: manualQuery.trim(),
        coreMotive: manualMotive.trim() || 'Osservazione personale registrata manualmente.',
        personalReflection: manualReflection.trim(),
        patternCategory: manualPattern,
        emotionalIntensity: manualIntensity,
      });
      setManualQuery('');
      setManualMotive('');
      setManualReflection('');
      setShowManualForm(false);
      onSelectNote(id);
    } finally {
      setManualBusy(false);
    }
  };

  const handleSeed = async () => {
    setSeedingBusy(true);
    try {
      await onSeedSampleNotes();
    } finally {
      setSeedingBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      {/* Header strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E4DD] pb-4 dark:border-[#1E232D]">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#14171C] dark:text-[#F1F3F5]">
            Note Private Crittografate
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#5C6470] dark:text-[#9CA3AF]">
            <span>{isCloudSynced ? 'Sincronizzazione in tempo reale attiva' : 'Modalità locale crittografata'}</span>
            {lastSyncedIso && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Ultimo agg. {new Date(lastSyncedIso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{notes.length} note nel vault</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowManualForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#1E40AF] whitespace-nowrap shrink-0"
        >
          <FilePlus2 className="h-4 w-4" />
          {showManualForm ? 'Chiudi nuova nota' : 'Nuova nota manuale'}
        </button>
      </div>

      {/* Inline manual note creator */}
      {showManualForm && (
        <form
          onSubmit={handleCreateManual}
          className="space-y-4 rounded-2xl border border-[#E6E4DD] bg-white p-6 dark:border-[#1E232D] dark:bg-[#12161E]"
        >
          <h2 className="font-display text-lg font-semibold text-[#14171C] dark:text-[#F1F3F5]">
            Registra una riflessione privata
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="manual-query"
                className="block text-xs font-medium text-[#374151] dark:text-[#CBD5E1]"
              >
                Comportamento osservato (&ldquo;Perché io faccio...&rdquo;)
              </label>
              <input
                id="manual-query"
                type="text"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder="Es. Controllo le email di lavoro prima di dormire"
                className="mt-1 w-full rounded-lg border border-[#D4D0C7] bg-[#F8F7F4] px-3.5 py-2 text-sm text-[#14171C] focus:border-[#1D4ED8] focus:bg-white focus:outline-none dark:border-[#2A3140] dark:bg-[#0B0D11] dark:text-[#F1F3F5]"
              />
            </div>

            <div>
              <label
                htmlFor="manual-pattern"
                className="block text-xs font-medium text-[#374151] dark:text-[#CBD5E1]"
              >
                Pattern psicologico
              </label>
              <select
                id="manual-pattern"
                value={manualPattern}
                onChange={(e) => setManualPattern(e.target.value as PatternCategory)}
                className="mt-1 w-full rounded-lg border border-[#D4D0C7] bg-[#F8F7F4] px-3 py-2 text-sm text-[#14171C] dark:border-[#2A3140] dark:bg-[#0B0D11] dark:text-[#F1F3F5]"
              >
                {PATTERN_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="manual-intensity"
                className="block text-xs font-medium text-[#374151] dark:text-[#CBD5E1]"
              >
                Intensità emotiva (1-5)
              </label>
              <select
                id="manual-intensity"
                value={manualIntensity}
                onChange={(e) => setManualIntensity(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-[#D4D0C7] bg-[#F8F7F4] px-3 py-2 font-mono text-sm text-[#14171C] dark:border-[#2A3140] dark:bg-[#0B0D11] dark:text-[#F1F3F5]"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} / 5
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="manual-motive"
                className="block text-xs font-medium text-[#374151] dark:text-[#CBD5E1]"
              >
                Motivo ipotizzato o osservato
              </label>
              <input
                id="manual-motive"
                type="text"
                value={manualMotive}
                onChange={(e) => setManualMotive(e.target.value)}
                placeholder="Es. Bisogno di controllare l’incertezza prima del riposo"
                className="mt-1 w-full rounded-lg border border-[#D4D0C7] bg-[#F8F7F4] px-3.5 py-2 text-sm text-[#14171C] focus:border-[#1D4ED8] focus:bg-white focus:outline-none dark:border-[#2A3140] dark:bg-[#0B0D11] dark:text-[#F1F3F5]"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="manual-reflection"
                className="block text-xs font-medium text-[#374151] dark:text-[#CBD5E1]"
              >
                Nota personale
              </label>
              <textarea
                id="manual-reflection"
                rows={2}
                value={manualReflection}
                onChange={(e) => setManualReflection(e.target.value)}
                placeholder="Scrivi liberamente le tue sensazioni o cosa vuoi cambiare..."
                className="mt-1 w-full rounded-lg border border-[#D4D0C7] bg-[#F8F7F4] px-3.5 py-2 text-sm text-[#14171C] focus:border-[#1D4ED8] focus:bg-white focus:outline-none dark:border-[#2A3140] dark:bg-[#0B0D11] dark:text-[#F1F3F5]"
              />
            </div>
          </div>

          {manualError && (
            <p role="alert" className="text-xs text-red-700 dark:text-red-300">
              {manualError}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowManualForm(false)}
              className="rounded-lg border border-[#D4D0C7] px-4 py-2 text-xs font-medium text-[#14171C] hover:bg-[#F2F0EB] dark:border-[#2A3140] dark:text-[#F1F3F5]"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={manualBusy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#14171C] px-4 py-2 text-xs font-medium text-white hover:bg-[#272D38] dark:bg-[#F1F3F5] dark:text-[#0B0D11]"
            >
              <Lock className="h-3.5 w-3.5" />
              {manualBusy ? 'Salvataggio...' : 'Cifra e Salva'}
            </button>
          </div>
        </form>
      )}

      {/* Empty State */}
      {notes.length === 0 ? (
        <section className="rounded-2xl border border-[#E6E4DD] bg-white p-10 text-center dark:border-[#1E232D] dark:bg-[#12161E]">
          <Lock className="mx-auto h-8 w-8 text-[#1D4ED8] dark:text-[#60A5FA]" />
          <h2 className="mt-4 font-display text-xl font-semibold text-[#14171C] dark:text-[#F1F3F5]">
            Il tuo archivio privato è ancora vuoto
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#5C6470] dark:text-[#9CA3AF]">
            Ogni analisi salvata dall&apos;esecutore o creata manualmente viene cifrata sul tuo
            dispositivo e resa consultabile solo da te.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onGoToExecutor}
              className="rounded-lg bg-[#1D4ED8] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1E40AF]"
            >
              Fai la prima domanda all&apos;esecutore
            </button>
            <button
              type="button"
              disabled={seedingBusy}
              onClick={handleSeed}
              className="inline-flex items-center gap-2 rounded-lg border border-[#D4D0C7] bg-[#F8F7F4] px-4 py-2.5 text-sm font-medium text-[#14171C] hover:bg-[#EBE8E0] disabled:opacity-50 dark:border-[#2A3140] dark:bg-[#0B0D11] dark:text-[#F1F3F5]"
            >
              <Sparkles className="h-4 w-4 text-[#1D4ED8] dark:text-[#60A5FA]" />
              {seedingBusy ? 'Crittografia esempi...' : 'Carica 3 riflessioni di esempio'}
            </button>
          </div>
        </section>
      ) : (
        /* Master-Detail Split Layout */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left column: Search + Filter + Notes list */}
          <aside className="space-y-4 lg:col-span-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#88909B]" />
              <input
                type="search"
                aria-label="Cerca nelle note decifrate"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cerca nei testi decifrati..."
                className="w-full rounded-lg border border-[#D4D0C7] bg-white py-2 pl-9 pr-3 text-sm text-[#14171C] placeholder:text-[#88909B] focus:border-[#1D4ED8] focus:outline-none dark:border-[#2A3140] dark:bg-[#12161E] dark:text-[#F1F3F5]"
              />
            </div>

            {/* Interactive Segmented Filter */}
            <div
              role="group"
              aria-label="Filtra per stato della risoluzione"
              className="flex items-center gap-1 overflow-x-auto rounded-lg bg-[#EBE8E0] p-1 dark:bg-[#141820]"
            >
              {(['all', 'to_explore', 'practicing', 'integrated'] as const).map((st) => {
                const active = statusFilter === st;
                const label = st === 'all' ? 'Tutte' : STATUS_LABELS[st];
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`flex-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-[#14171C] shadow-xs dark:bg-[#1F2633] dark:text-[#F1F3F5]'
                        : 'text-[#5C6470] hover:text-[#14171C] dark:text-[#9CA3AF] dark:hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* List */}
            <div className="space-y-2.5">
              {filteredNotes.length === 0 ? (
                <p className="rounded-xl border border-[#E6E4DD] bg-white p-6 text-center text-sm text-[#5C6470] dark:border-[#1E232D] dark:bg-[#12161E] dark:text-[#9CA3AF]">
                  Nessuna nota corrisponde ai filtri attuali.
                </p>
              ) : (
                filteredNotes.map((note) => {
                  const isSelected = activeNote?.id === note.id;
                  const payload = note.decrypted;
                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => onSelectNote(note.id)}
                      className={`w-full rounded-xl border p-4 text-left transition-colors ${
                        isSelected
                          ? 'border-[#1D4ED8] bg-white dark:border-[#60A5FA] dark:bg-[#141923]'
                          : 'border-[#E6E4DD] bg-white/80 hover:border-[#C6C2B8] hover:bg-white dark:border-[#1E232D] dark:bg-[#12161E] dark:hover:border-[#2F3747]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs text-[#5C6470] dark:text-[#9CA3AF]">
                        <span className="truncate font-medium text-[#1D4ED8] dark:text-[#60A5FA]">
                          {payload?.patternCategory ?? 'Cifrato'}
                        </span>
                        <span className="font-mono tabular-nums shrink-0">
                          {formatDateIt(note.createdAtIso)}
                        </span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm font-medium text-[#14171C] dark:text-[#F1F3F5]">
                        {payload?.behaviorQuery ?? 'Impossibile decifrare con la chiave attuale'}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-[#5C6470] dark:text-[#9CA3AF]">
                        <span>{STATUS_LABELS[note.status]}</span>
                        {payload && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              Intensità {payload.emotionalIntensity}/5
                            </span>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Right column: Selected Note Detail & Reflection Editor */}
          <main className="lg:col-span-7">
            {activeNote?.decrypted ? (
              <div className="space-y-6 rounded-2xl border border-[#E6E4DD] bg-white p-6 sm:p-8 dark:border-[#1E232D] dark:bg-[#12161E]">
                {/* Top metadata & Delete */}
                <div className="flex items-start justify-between gap-4 border-b border-[#E6E4DD] pb-5 dark:border-[#1E232D]">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#5C6470] dark:text-[#9CA3AF]">
                      <span className="font-medium text-[#1D4ED8] dark:text-[#60A5FA]">
                        {activeNote.decrypted.patternCategory}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        Creata il {formatDateIt(activeNote.createdAtIso)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>AES-256-GCM</span>
                    </div>
                    <h2 className="font-display text-xl font-semibold text-[#14171C] sm:text-2xl dark:text-[#F1F3F5]">
                      {activeNote.decrypted.behaviorQuery}
                    </h2>
                  </div>

                  {confirmDeleteId === activeNote.id ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await onDeleteNote(activeNote.id);
                          setConfirmDeleteId(null);
                        }}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                      >
                        Conferma elimina
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg border border-[#D4D0C7] px-3 py-1.5 text-xs text-[#14171C] dark:border-[#2A3140] dark:text-[#F1F3F5]"
                      >
                        Annulla
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Elimina nota '${activeNote.decrypted.behaviorQuery}'`}
                      onClick={() => setConfirmDeleteId(activeNote.id)}
                      className="shrink-0 rounded-lg border border-[#E6E4DD] p-2 text-[#5C6470] transition-colors hover:border-red-300 hover:text-red-600 dark:border-[#232936] dark:text-[#9CA3AF] dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Motive + Analysis */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold tracking-wide text-[#5C6470] dark:text-[#9CA3AF]">
                      Motivo individuato
                    </h3>
                    <p className="mt-1.5 text-[15px] font-medium leading-relaxed text-[#14171C] dark:text-[#F1F3F5]">
                      {activeNote.decrypted.coreMotive}
                    </p>
                  </div>

                  {activeNote.decrypted.psychologicalAnalysis && (
                    <div>
                      <h3 className="text-xs font-semibold tracking-wide text-[#5C6470] dark:text-[#9CA3AF]">
                        Approfondimento psicologico
                      </h3>
                      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-[#374151] dark:text-[#CBD5E1]">
                        {activeNote.decrypted.psychologicalAnalysis}
                      </p>
                    </div>
                  )}

                  {activeNote.decrypted.solutionSteps.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold tracking-wide text-[#5C6470] dark:text-[#9CA3AF]">
                        Risoluzioni proposte
                      </h3>
                      <ul className="mt-2 space-y-2">
                        {activeNote.decrypted.solutionSteps.map((step, i) => (
                          <li
                            key={i}
                            className="flex items-baseline gap-2.5 rounded-lg bg-[#F8F7F4] px-3.5 py-2.5 text-sm text-[#14171C] dark:bg-[#0E1117] dark:text-[#E2E8F0]"
                          >
                            <span className="font-mono text-xs font-semibold text-[#15803D] dark:text-[#4ADE80] tabular-nums">
                              0{i + 1}.
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {activeNote.decrypted.sources.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold tracking-wide text-[#5C6470] dark:text-[#9CA3AF]">
                        Fonti consultate
                      </h3>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {activeNote.decrypted.sources.map((src) => (
                          <a
                            key={src.uri}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-[#1D4ED8] underline underline-offset-4 hover:text-[#1E40AF] dark:text-[#60A5FA]"
                          >
                            <span className="max-w-[240px] truncate">{src.title}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Personal Reflection & Status Editor */}
                <div className="space-y-4 border-t border-[#E6E4DD] pt-5 dark:border-[#1E232D]">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="note-status-select"
                        className="block text-xs font-medium text-[#374151] dark:text-[#CBD5E1]"
                      >
                        Stato della consapevolezza
                      </label>
                      <select
                        id="note-status-select"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as NoteStatus)}
                        className="mt-1.5 w-full rounded-lg border border-[#D4D0C7] bg-[#F8F7F4] px-3 py-2 text-sm text-[#14171C] dark:border-[#2A3140] dark:bg-[#0B0D11] dark:text-[#F1F3F5]"
                      >
                        <option value="to_explore">Da esplorare</option>
                        <option value="practicing">In pratica</option>
                        <option value="integrated">Integrato</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="note-intensity-select"
                        className="block text-xs font-medium text-[#374151] dark:text-[#CBD5E1]"
                      >
                        Intensità percepita
                      </label>
                      <select
                        id="note-intensity-select"
                        value={editIntensity}
                        onChange={(e) => setEditIntensity(Number(e.target.value))}
                        className="mt-1.5 w-full rounded-lg border border-[#D4D0C7] bg-[#F8F7F4] px-3 py-2 font-mono text-sm text-[#14171C] dark:border-[#2A3140] dark:bg-[#0B0D11] dark:text-[#F1F3F5]"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n} / 5
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="note-reflection-editor"
                      className="block text-xs font-medium text-[#374151] dark:text-[#CBD5E1]"
                    >
                      Diario personale e riscontri nel tempo
                    </label>
                    <textarea
                      id="note-reflection-editor"
                      rows={4}
                      value={editReflection}
                      onChange={(e) => setEditReflection(e.target.value)}
                      placeholder="Annota come hai reagito applicando la risoluzione..."
                      className="mt-1.5 w-full rounded-lg border border-[#D4D0C7] bg-[#F8F7F4] px-3.5 py-2.5 text-sm text-[#14171C] focus:border-[#1D4ED8] focus:bg-white focus:outline-none dark:border-[#2A3140] dark:bg-[#0B0D11] dark:text-[#F1F3F5]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleSaveChanges}
                      disabled={savingEdit}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E40AF] disabled:opacity-50"
                    >
                      <Lock className="h-4 w-4" />
                      {savingEdit ? 'Cifratura...' : 'Salva modifiche crittografate'}
                    </button>

                    {saveFeedback && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15803D] dark:text-[#4ADE80]">
                        <Check className="h-4 w-4" />
                        {saveFeedback}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#E6E4DD] bg-white p-8 text-center text-sm text-[#5C6470] dark:border-[#1E232D] dark:bg-[#12161E] dark:text-[#9CA3AF]">
                Seleziona una nota dall&apos;elenco a sinistra per leggerla in chiaro.
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
};
