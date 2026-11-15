import React, { useMemo, useState } from 'react';
import { ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { GroundingSource, VaultNoteRecord } from '../types/why';
import { computeAwarenessMetrics } from '../utils/awareness';

interface AwarenessViewProps {
  notes: VaultNoteRecord[];
  onGoToExecutor: () => void;
}

export const AwarenessView: React.FC<AwarenessViewProps> = ({ notes, onGoToExecutor }) => {
  const metrics = useMemo(() => computeAwarenessMetrics(notes), [notes]);

  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisText, setSynthesisText] = useState<string | null>(null);
  const [synthesisSources, setSynthesisSources] = useState<GroundingSource[]>([]);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);

  const handleGenerateSynthesis = async () => {
    const decrypted = notes.filter((n) => n.decrypted !== null);
    if (decrypted.length === 0) return;

    setIsSynthesizing(true);
    setSynthesisError(null);

    try {
      const themes = decrypted.slice(0, 15).map((n) => ({
        query: n.decrypted!.behaviorQuery,
        pattern: n.decrypted!.patternCategory,
        reflection: n.decrypted!.personalReflection,
        status: n.status,
      }));

      const res = await fetch('/api/awareness-synthesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themes }),
      });

      const data = (await res.json()) as {
        synthesis?: string;
        sources?: GroundingSource[];
        error?: string;
      };

      if (!res.ok || !data.synthesis) {
        throw new Error(data.error || 'Impossibile generare la sintesi evolutiva.');
      }

      setSynthesisText(data.synthesis);
      setSynthesisSources(data.sources ?? []);
    } catch (err) {
      setSynthesisError(
        err instanceof Error ? err.message : 'Errore durante la sintesi longitudinale.'
      );
    } finally {
      setIsSynthesizing(false);
    }
  };

  if (metrics.totalNotes === 0) {
    return (
      <section className="mx-auto max-w-[960px] rounded-2xl border border-[#E6E4DD] bg-white p-10 text-center dark:border-[#1E232D] dark:bg-[#12161E]">
        <h1 className="font-display text-2xl font-semibold text-[#14171C] dark:text-[#F1F3F5]">
          Consapevolezza nel Tempo
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#5C6470] dark:text-[#9CA3AF]">
          Quando registrerai i primi comportamenti nelle tue note private, qui apparirà la mappa dei
          tuoi pattern psicologici ricorrenti e dei tuoi progressi.
        </p>
        <button
          type="button"
          onClick={onGoToExecutor}
          className="mt-6 rounded-lg bg-[#1D4ED8] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1E40AF]"
        >
          Inizia la prima analisi
        </button>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-[1040px] space-y-8">
      <div className="border-b border-[#E6E4DD] pb-4 dark:border-[#1E232D]">
        <h1 className="font-display text-2xl font-semibold text-[#14171C] dark:text-[#F1F3F5]">
          Consapevolezza Personale nel Tempo
        </h1>
        <p className="mt-1 text-sm text-[#5C6470] dark:text-[#9CA3AF]">
          Calcolata interamente in locale nella memoria del browser dopo la decifratura delle tue
          note.
        </p>
      </div>

      {/* 4-column hairline KPI strip */}
      <section
        aria-label="Indicatori chiave di consapevolezza"
        className="grid grid-cols-2 divide-y divide-[#E6E4DD] overflow-hidden rounded-2xl border border-[#E6E4DD] bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0 dark:divide-[#1E232D] dark:border-[#1E232D] dark:bg-[#12161E]"
      >
        <div className="p-5">
          <p className="text-xs text-[#5C6470] dark:text-[#9CA3AF]">Azioni registrate</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[#14171C] tabular-nums dark:text-[#F1F3F5]">
            {metrics.totalNotes}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs text-[#5C6470] dark:text-[#9CA3AF]">Risoluzioni integrate</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[#15803D] tabular-nums dark:text-[#4ADE80]">
            {metrics.integrationRate}%
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs text-[#5C6470] dark:text-[#9CA3AF]">Note con riflessione</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[#1D4ED8] tabular-nums dark:text-[#60A5FA]">
            {metrics.reflectionDepthRate}%
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs text-[#5C6470] dark:text-[#9CA3AF]">Intensità emotiva media</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[#14171C] tabular-nums dark:text-[#F1F3F5]">
            {metrics.averageIntensity}/5
          </p>
        </div>
      </section>

      {/* Pattern breakdown + Intensity timeline */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-2xl border border-[#E6E4DD] bg-white p-6 dark:border-[#1E232D] dark:bg-[#12161E] lg:col-span-6">
          <h2 className="text-sm font-semibold text-[#14171C] dark:text-[#F1F3F5]">
            Pattern psicologici ricorrenti
          </h2>
          <p className="mt-1 text-xs text-[#5C6470] dark:text-[#9CA3AF]">
            Frequenza dei meccanismi individuati nelle tue analisi.
          </p>

          <ul className="mt-5 space-y-4">
            {metrics.patternBreakdown.map((item) => (
              <li key={item.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[#14171C] dark:text-[#E5E7EB]">
                    {item.category}
                  </span>
                  <span className="font-mono text-xs text-[#5C6470] tabular-nums dark:text-[#9CA3AF]">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#F2F0EB] dark:bg-[#1C222D]">
                  <div
                    className="h-full rounded-full bg-[#1D4ED8] dark:bg-[#60A5FA]"
                    style={{ width: `${Math.max(item.percentage, 4)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-[#E6E4DD] bg-white p-6 dark:border-[#1E232D] dark:bg-[#12161E] lg:col-span-6">
          <h2 className="text-sm font-semibold text-[#14171C] dark:text-[#F1F3F5]">
            Stato delle risoluzioni e andamento
          </h2>
          <p className="mt-1 text-xs text-[#5C6470] dark:text-[#9CA3AF]">
            Progressione dal riconoscimento all&apos;integrazione pratica.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-3 border-b border-[#E6E4DD] pb-5 dark:border-[#1E232D]">
            <div>
              <span className="text-xs text-[#5C6470] dark:text-[#9CA3AF]">Da esplorare</span>
              <p className="mt-0.5 font-mono text-lg font-semibold text-[#14171C] tabular-nums dark:text-[#F1F3F5]">
                {metrics.toExploreCount}
              </p>
            </div>
            <div>
              <span className="text-xs text-[#5C6470] dark:text-[#9CA3AF]">In pratica</span>
              <p className="mt-0.5 font-mono text-lg font-semibold text-[#D97706] tabular-nums">
                {metrics.practicingCount}
              </p>
            </div>
            <div>
              <span className="text-xs text-[#5C6470] dark:text-[#9CA3AF]">Integrate</span>
              <p className="mt-0.5 font-mono text-lg font-semibold text-[#15803D] tabular-nums dark:text-[#4ADE80]">
                {metrics.integratedCount}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs font-medium text-[#5C6470] dark:text-[#9CA3AF]">
              Storico intensità emotiva per giornata (1–5)
            </p>
            {metrics.timeline.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E6E4DD] text-[#5C6470] dark:border-[#1E232D] dark:text-[#9CA3AF]">
                      <th className="py-2 font-medium">Data</th>
                      <th className="py-2 text-right font-medium">Note</th>
                      <th className="py-2 text-right font-medium">Intensità media</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F0EB] dark:divide-[#1A1F29]">
                    {metrics.timeline.map((point) => (
                      <tr key={point.dateLabel}>
                        <td className="py-2 font-mono text-[#14171C] tabular-nums dark:text-[#E5E7EB]">
                          {point.dateLabel}
                        </td>
                        <td className="py-2 text-right font-mono text-[#5C6470] tabular-nums dark:text-[#9CA3AF]">
                          {point.count}
                        </td>
                        <td className="py-2 text-right font-mono font-medium text-[#1D4ED8] tabular-nums dark:text-[#60A5FA]">
                          {point.avgIntensity} / 5
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Longitudinal AI Synthesis */}
      <section className="rounded-2xl border border-[#E6E4DD] bg-white p-6 sm:p-8 dark:border-[#1E232D] dark:bg-[#12161E]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#14171C] dark:text-[#F1F3F5]">
              Sintesi Evolutiva Longitudinale
            </h2>
            <p className="mt-1 max-w-[65ch] text-xs text-[#5C6470] dark:text-[#9CA3AF]">
              Su tua richiesta esplicita, analizza insieme i temi ricorrenti delle tue note per
              individuare schemi invisibili e priorità di crescita.
            </p>
          </div>
          <button
            type="button"
            disabled={isSynthesizing}
            onClick={handleGenerateSynthesis}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-4 py-2 text-xs font-medium text-white hover:bg-[#1E40AF] disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {isSynthesizing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sintesi in corso...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Genera sintesi evolutiva
              </>
            )}
          </button>
        </div>

        {synthesisError && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
          >
            {synthesisError}
          </div>
        )}

        {synthesisText && (
          <div className="mt-6 space-y-4 border-t border-[#E6E4DD] pt-5 dark:border-[#1E232D]">
            <div className="max-w-[72ch] whitespace-pre-line text-[15px] leading-relaxed text-[#374151] dark:text-[#CBD5E1]">
              {synthesisText}
            </div>
            {synthesisSources.length > 0 && (
              <div className="flex flex-wrap gap-3 pt-2">
                {synthesisSources.map((src) => (
                  <a
                    key={src.uri}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#1D4ED8] underline underline-offset-4 dark:text-[#60A5FA]"
                  >
                    <span className="max-w-[220px] truncate">{src.title}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
