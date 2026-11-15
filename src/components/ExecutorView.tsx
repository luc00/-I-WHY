import React, { useState } from 'react';
import {
  BookOpen,
  Check,
  ExternalLink,
  Lightbulb,
  Loader2,
  Lock,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import {
  BehavioralAnalysis,
  PersonalContextProfile,
} from '../types/why';

interface ExecutorViewProps {
  personalContext: PersonalContextProfile;
  recentThemes: string[];
  onOpenContextModal: () => void;
  onSaveNote: (params: {
    analysis: BehavioralAnalysis;
    solutionRequested: boolean;
    personalReflection: string;
    emotionalIntensity: number;
  }) => Promise<string>;
  onNavigateToNotes: (noteId: string) => void;
  embeddedInSheet?: boolean;
}

const STARTER_PROMPTS = [
  'Perché rimando sempre i compiti importanti fino all’ultimo minuto?',
  'Perché controllo il telefono appena mi sveglio anche se non voglio?',
  'Perché dico sempre di sì alle richieste altrui quando sono già esausto?',
  'Perché compro cose di cui non ho bisogno nei momenti di stress?',
];

export const ExecutorView: React.FC<ExecutorViewProps> = ({
  personalContext,
  recentThemes,
  onOpenContextModal,
  onSaveNote,
  onNavigateToNotes,
  embeddedInSheet = false,
}) => {
  const [query, setQuery] = useState('');
  const [includePersonalContext, setIncludePersonalContext] = useState(true);
  const [revealSolutionImmediately, setRevealSolutionImmediately] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<BehavioralAnalysis | null>(null);
  const [solutionVisible, setSolutionVisible] = useState(false);

  const [emotionalIntensity, setEmotionalIntensity] = useState(3);
  const [personalReflection, setPersonalReflection] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const hasContextData = Boolean(
    personalContext.goals.trim() ||
      personalContext.recurringTriggers.trim() ||
      personalContext.dailyRoutines.trim() ||
      personalContext.values.trim()
  );

  const handleAnalyze = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const targetQuery = (overrideQuery ?? query).trim();

    if (targetQuery.length < 4) {
      setAnalysisError('Descrivi il comportamento con almeno 4 caratteri.');
      return;
    }

    setAnalysisError(null);
    setSaveError(null);
    setSavedNoteId(null);
    setIsAnalyzing(true);
    setSolutionVisible(revealSolutionImmediately);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: targetQuery,
          personalContext: includePersonalContext && hasContextData ? personalContext : null,
          recentThemes: includePersonalContext ? recentThemes : [],
        }),
      });

      const data = (await response.json()) as {
        analysis?: BehavioralAnalysis;
        error?: string;
      };

      if (!response.ok || !data.analysis) {
        throw new Error(data.error || 'Impossibile completare la ricerca psicologica.');
      }

      setAnalysis(data.analysis);
    } catch (err) {
      setAnalysisError(
        err instanceof Error ? err.message : 'Errore di connessione durante l’analisi.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveToVault = async () => {
    if (!analysis) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const newId = await onSaveNote({
        analysis,
        solutionRequested: solutionVisible,
        personalReflection: personalReflection.trim(),
        emotionalIntensity,
      });
      setSavedNoteId(newId);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Errore durante la cifratura della nota.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const HeadingTag = embeddedInSheet ? 'h2' : 'h1';

  return (
    <div className={embeddedInSheet ? 'w-full space-y-8' : 'mx-auto max-w-[960px] space-y-8'}>
      {/* Primary Inquiry Composer */}
      <section
        className={
          embeddedInSheet
            ? ''
            : 'rounded-2xl border border-[#E6E4DD] bg-white p-6 sm:p-8 dark:border-[#1E232D] dark:bg-[#12161E]'
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <HeadingTag className="font-display text-2xl font-semibold tracking-tight text-[#14171C] sm:text-3xl dark:text-[#F1F3F5] [text-wrap:balance]">
              Perché io faccio questo?
            </HeadingTag>
            <p className="mt-1.5 max-w-[65ch] text-sm text-[#5C6470] dark:text-[#9CA3AF]">
              Descrivi un gesto, un’abitudine o una reazione ricorrente. L’esecutore consulta
              ricerche psicologiche dal web, incrocia i tuoi dati personali se autorizzato e
              individua il motivo più probabile.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenContextModal}
            className="inline-flex items-center gap-2 rounded-lg border border-[#D4D0C7] bg-[#F8F7F4] px-3.5 py-2 text-xs font-medium text-[#14171C] transition-colors hover:bg-[#EBE8E0] dark:border-[#2A3140] dark:bg-[#0B0D11] dark:text-[#F1F3F5] dark:hover:bg-[#1C222D] whitespace-nowrap shrink-0"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {hasContextData ? 'Modifica dati personali' : 'Aggiungi dati personali'}
          </button>
        </div>

        <form onSubmit={(e) => handleAnalyze(e)} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="why-query-input"
              className="block text-sm font-medium text-[#14171C] dark:text-[#E5E7EB]"
            >
              Comportamento o domanda da esplorare
            </label>
            <textarea
              id="why-query-input"
              rows={3}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Es. Perché io evito di rispondere ai messaggi delle persone a cui tengo quando sono sotto pressione?"
              className="mt-2 w-full rounded-xl border border-[#D4D0C7] bg-[#F8F7F4] px-4 py-3 text-[15px] text-[#14171C] placeholder:text-[#88909B] focus:border-[#1D4ED8] focus:bg-white focus:outline-none dark:border-[#2A3140] dark:bg-[#0B0D11] dark:text-[#F1F3F5] dark:focus:border-[#60A5FA]"
            />
          </div>

          {/* Starter examples as quiet clickable buttons */}
          <div className="space-y-1.5">
            <span className="block text-xs text-[#5C6470] dark:text-[#9CA3AF]">
              Esempi rapidi di auto-indagine:
            </span>
            <div className="flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setQuery(sample)}
                  className="rounded-lg border border-[#E6E4DD] bg-[#F8F7F4] px-3 py-1.5 text-left text-xs text-[#374151] transition-colors hover:border-[#1D4ED8]/40 hover:text-[#1D4ED8] dark:border-[#232936] dark:bg-[#0E1117] dark:text-[#B5BCC7] dark:hover:text-[#60A5FA]"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          {/* Preferences + Primary CTA */}
          <div className="flex flex-col gap-4 border-t border-[#E6E4DD] pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#1E232D]">
            <div className="flex flex-col gap-2 text-xs text-[#4B5563] dark:text-[#B5BCC7]">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={includePersonalContext}
                  onChange={(e) => setIncludePersonalContext(e.target.checked)}
                  className="h-4 w-4 rounded border-[#D4D0C7] text-[#1D4ED8] focus:ring-[#1D4ED8]"
                />
                <span>
                  Analizza includendo contesto personale e storico ({recentThemes.length} temi salvati)
                </span>
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={revealSolutionImmediately}
                  onChange={(e) => {
                    setRevealSolutionImmediately(e.target.checked);
                    if (analysis) setSolutionVisible(e.target.checked);
                  }}
                  className="h-4 w-4 rounded border-[#D4D0C7] text-[#1D4ED8] focus:ring-[#1D4ED8]"
                />
                <span>Mostra subito la risoluzione pratica insieme al motivo</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isAnalyzing}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1E40AF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ricerca e analisi in corso...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Analizza comportamento
                </>
              )}
            </button>
          </div>
        </form>

        {analysisError && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
          >
            {analysisError}
          </div>
        )}
      </section>

      {/* Loading skeleton matching result proportions */}
      {isAnalyzing && (
        <section
          aria-live="polite"
          className={
            embeddedInSheet
              ? 'space-y-4 border-t border-[#E6E4DD] pt-8 dark:border-[#1E232D]'
              : 'space-y-4 rounded-2xl border border-[#E6E4DD] bg-white p-6 sm:p-8 dark:border-[#1E232D] dark:bg-[#12161E]'
          }
        >
          <div className="h-4 w-56 animate-pulse rounded bg-[#EBE8E0] dark:bg-[#1E232D]" />
          <div className="h-7 w-full animate-pulse rounded bg-[#EBE8E0] dark:bg-[#1E232D]" />
          <div className="h-24 w-full animate-pulse rounded bg-[#F2F0EB] dark:bg-[#171C26]" />
        </section>
      )}

      {/* Structured Psychological Analysis Result */}
      {!isAnalyzing && analysis && (
        <article
          className={
            embeddedInSheet
              ? 'space-y-8 border-t border-[#E6E4DD] pt-8 dark:border-[#1E232D]'
              : 'space-y-8 rounded-2xl border border-[#E6E4DD] bg-white p-6 sm:p-8 dark:border-[#1E232D] dark:bg-[#12161E]'
          }
        >
          {/* Unboxed typographic metadata header */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#5C6470] dark:text-[#9CA3AF]">
            <span className="font-medium text-[#1D4ED8] dark:text-[#60A5FA]">
              {analysis.patternCategory}
            </span>
            <span aria-hidden="true">·</span>
            <span>Driver: {analysis.emotionalDrivers.join(' · ')}</span>
            {analysis.sources.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {analysis.sources.length} fonti web consultate
                </span>
              </>
            )}
          </div>

          {/* Best Answer Synthesis */}
          <div className="border-b border-[#E6E4DD] pb-6 dark:border-[#1E232D]">
            <h2 className="text-xs font-semibold tracking-wide text-[#5C6470] dark:text-[#9CA3AF]">
              La risposta migliore
            </h2>
            <p className="mt-2 font-display text-xl leading-snug font-medium text-[#14171C] sm:text-2xl dark:text-[#F1F3F5]">
              {analysis.coreMotive}
            </p>
          </div>

          {/* Deep Psychological Analysis */}
          <div className="space-y-3 border-b border-[#E6E4DD] pb-6 dark:border-[#1E232D]">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[#14171C] dark:text-[#F1F3F5]">
              <BookOpen className="h-4 w-4 text-[#1D4ED8] dark:text-[#60A5FA]" />
              Analisi psicologica e meccanismi sottostanti
            </h2>
            <div className="max-w-[70ch] space-y-3 text-[15px] leading-relaxed text-[#374151] dark:text-[#CBD5E1]">
              {analysis.psychologicalAnalysis
                .split(/\n{2,}/)
                .map((para) => para.trim())
                .filter(Boolean)
                .map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
            </div>
          </div>

          {/* Reflection Prompts */}
          <div className="space-y-3 border-b border-[#E6E4DD] pb-6 dark:border-[#1E232D]">
            <h2 className="text-sm font-semibold text-[#14171C] dark:text-[#F1F3F5]">
              Spunti di riflessione personale
            </h2>
            <ol className="space-y-3">
              {analysis.reflectionPrompts.map((prompt, index) => (
                <li
                  key={index}
                  className="flex items-baseline gap-3 text-[15px] text-[#1F2937] dark:text-[#E2E8F0]"
                >
                  <span className="font-mono text-xs font-semibold text-[#1D4ED8] dark:text-[#60A5FA] tabular-nums">
                    0{index + 1}.
                  </span>
                  <span>{prompt}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Optional On-Demand Solution */}
          <div className="space-y-4 border-b border-[#E6E4DD] pb-6 dark:border-[#1E232D]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[#14171C] dark:text-[#F1F3F5]">
                <Lightbulb className="h-4 w-4 text-[#1D4ED8] dark:text-[#60A5FA]" />
                Risoluzione e strategie pratiche
              </h2>
              <button
                type="button"
                onClick={() => setSolutionVisible((v) => !v)}
                className="rounded-lg border border-[#D4D0C7] bg-[#F8F7F4] px-3.5 py-1.5 text-xs font-medium text-[#14171C] transition-colors hover:bg-[#EBE8E0] dark:border-[#2A3140] dark:bg-[#0B0D11] dark:text-[#F1F3F5] dark:hover:bg-[#1C222D] whitespace-nowrap shrink-0"
              >
                {solutionVisible ? 'Nascondi soluzione' : 'Mostra soluzione pratica'}
              </button>
            </div>

            {solutionVisible ? (
              <ol className="space-y-3">
                {analysis.solutionSteps.map((step, index) => (
                  <li
                    key={index}
                    className="flex items-baseline gap-3 rounded-xl bg-[#F8F7F4] px-4 py-3 text-sm text-[#14171C] dark:bg-[#0E1117] dark:text-[#E2E8F0]"
                  >
                    <span className="font-mono text-xs font-semibold text-[#15803D] dark:text-[#4ADE80] tabular-nums">
                      0{index + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-[#5C6470] dark:text-[#9CA3AF]">
                Se desideri una risoluzione operativa oltre alla comprensione psicologica, clicca
                su &ldquo;Mostra soluzione pratica&rdquo;.
              </p>
            )}
          </div>

          {/* Google Search Grounding Sources */}
          {analysis.sources.length > 0 && (
            <div className="space-y-2.5 border-b border-[#E6E4DD] pb-6 dark:border-[#1E232D]">
              <h2 className="text-xs font-semibold tracking-wide text-[#5C6470] dark:text-[#9CA3AF]">
                Fonti dal web (Google Search)
              </h2>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {analysis.sources.map((src) => (
                  <li key={src.uri}>
                    <a
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 rounded-lg border border-[#E6E4DD] bg-[#F8F7F4] px-3 py-2 text-xs text-[#14171C] transition-colors hover:border-[#1D4ED8]/50 hover:text-[#1D4ED8] dark:border-[#232936] dark:bg-[#0E1117] dark:text-[#E2E8F0] dark:hover:text-[#60A5FA]"
                    >
                      <span className="truncate">{src.title}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Save Encrypted Note to Private Vault */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-[#14171C] dark:text-[#F1F3F5]">
                  Registra nella tua pagina di note private
                </h2>
                <p className="text-xs text-[#5C6470] dark:text-[#9CA3AF]">
                  L&apos;intera analisi e la tua riflessione verranno cifrate con AES-256-GCM prima
                  del salvataggio.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="intensity-select"
                  className="text-xs text-[#5C6470] dark:text-[#9CA3AF]"
                >
                  Intensità emotiva:
                </label>
                <select
                  id="intensity-select"
                  value={emotionalIntensity}
                  onChange={(e) => setEmotionalIntensity(Number(e.target.value))}
                  className="rounded-lg border border-[#D4D0C7] bg-[#F8F7F4] px-2.5 py-1.5 font-mono text-xs text-[#14171C] dark:border-[#2A3140] dark:bg-[#0B0D11] dark:text-[#F1F3F5]"
                >
                  <option value={1}>1 / 5 (Lieve)</option>
                  <option value={2}>2 / 5 (Moderata)</option>
                  <option value={3}>3 / 5 (Media)</option>
                  <option value={4}>4 / 5 (Forte)</option>
                  <option value={5}>5 / 5 (Intensa)</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="personal-reflection-input"
                className="block text-xs font-medium text-[#374151] dark:text-[#CBD5E1]"
              >
                La tua riflessione personale (facoltativa)
              </label>
              <textarea
                id="personal-reflection-input"
                rows={2}
                value={personalReflection}
                onChange={(e) => setPersonalReflection(e.target.value)}
                placeholder="Cosa risuona di più in te? Cosa vuoi osservare la prossima volta?"
                className="mt-1.5 w-full rounded-lg border border-[#D4D0C7] bg-[#F8F7F4] px-3.5 py-2.5 text-sm text-[#14171C] focus:border-[#1D4ED8] focus:bg-white focus:outline-none dark:border-[#2A3140] dark:bg-[#0B0D11] dark:text-[#F1F3F5]"
              />
            </div>

            {saveError && (
              <div
                role="alert"
                className="rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
              >
                {saveError}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {!savedNoteId ? (
                <button
                  type="button"
                  onClick={handleSaveToVault}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#14171C] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#272D38] disabled:opacity-50 dark:bg-[#F1F3F5] dark:text-[#0B0D11] dark:hover:bg-white whitespace-nowrap shrink-0"
                >
                  <Lock className="h-4 w-4" />
                  {isSaving ? 'Crittografia e salvataggio...' : 'Cifra e Salva nelle Note Private'}
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#15803D] dark:text-[#4ADE80]">
                    <Check className="h-4 w-4" />
                    Nota cifrata e salvata nel vault
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigateToNotes(savedNoteId)}
                    className="rounded-lg border border-[#D4D0C7] bg-white px-4 py-2 text-xs font-medium text-[#14171C] hover:bg-[#F2F0EB] dark:border-[#2A3140] dark:bg-[#141820] dark:text-[#F1F3F5]"
                  >
                    Apri in Note Private
                  </button>
                </div>
              )}
            </div>
          </div>
        </article>
      )}
    </div>
  );
};
