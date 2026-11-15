import { BehavioralAnalysis, GroundingSource, PatternCategory } from '../types/why';

const VALID_PATTERNS: PatternCategory[] = [
  'Evitamento Emotivo',
  'Ricerca di Approvazione',
  'Sovraccarico Cognitivo',
  'Abitudine Automatica',
  'Bisogno di Controllo',
  'Paura del Fallimento',
  'Regolazione Emotiva',
  'Altro',
];

export function normalizePatternCategory(raw: string): PatternCategory {
  const cleaned = raw.trim().toLowerCase();
  const matched = VALID_PATTERNS.find((p) => p.toLowerCase() === cleaned);
  if (matched) return matched;

  if (cleaned.includes('evit') || cleaned.includes('procrast')) return 'Evitamento Emotivo';
  if (cleaned.includes('approv') || cleaned.includes('conferm')) return 'Ricerca di Approvazione';
  if (cleaned.includes('sovraccar') || cleaned.includes('fatica') || cleaned.includes('decision')) return 'Sovraccarico Cognitivo';
  if (cleaned.includes('abitud') || cleaned.includes('automat') || cleaned.includes('loop')) return 'Abitudine Automatica';
  if (cleaned.includes('controll')) return 'Bisogno di Controllo';
  if (cleaned.includes('fallim') || cleaned.includes('perfezion') || cleaned.includes('giudiz')) return 'Paura del Fallimento';
  if (cleaned.includes('regolaz') || cleaned.includes('stress') || cleaned.includes('ansia')) return 'Regolazione Emotiva';
  return 'Altro';
}

function extractSection(text: string, tag: string, nextTags: string[]): string {
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const nextAlternatives = nextTags
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const pattern = new RegExp(
    `(?:^|\\n)\\s*(?:#+\\s*)?(?:\\*\\*)?\\[${escapedTag}\\](?:\\*\\*)?\\s*:?\\s*([\\s\\S]*?)(?=(?:\\n\\s*(?:#+\\s*)?(?:\\*\\*)?\\[(?:${nextAlternatives})\\])|$)`,
    'i'
  );
  const match = text.match(pattern);
  return match?.[1]?.trim() ?? '';
}

function extractBulletList(block: string): string[] {
  if (!block) return [];
  return block
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter((line) => line.length > 0);
}

export function extractGroundingSources(groundingMetadata: unknown): {
  sources: GroundingSource[];
  searchQueries: string[];
} {
  const meta = groundingMetadata as
    | {
        webSearchQueries?: unknown[];
        groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
      }
    | undefined;

  const seen = new Set<string>();
  const sources: GroundingSource[] = [];

  if (Array.isArray(meta?.groundingChunks)) {
    for (const chunk of meta.groundingChunks) {
      const uri = chunk?.web?.uri?.trim();
      const title = chunk?.web?.title?.trim();
      if (uri && !seen.has(uri)) {
        seen.add(uri);
        sources.push({
          uri,
          title: title && title.length > 0 ? title : uri,
        });
      }
    }
  }

  const searchQueries = Array.isArray(meta?.webSearchQueries)
    ? meta.webSearchQueries.filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
    : [];

  return { sources, searchQueries };
}

export function parseBehavioralResponse(
  query: string,
  rawText: string,
  groundingMetadata?: unknown
): BehavioralAnalysis {
  const allTags = [
    'PATTERN',
    'MOTIVO_MIGLIORE',
    'ANALISI_PSICOLOGICA',
    'SPUNTI_RIFLESSIONE',
    'SOLUZIONI',
    'DRIVER_EMOTIVI',
  ];

  const patternRaw = extractSection(rawText, 'PATTERN', allTags);
  const coreMotive = extractSection(rawText, 'MOTIVO_MIGLIORE', allTags);
  const psychologicalAnalysis = extractSection(rawText, 'ANALISI_PSICOLOGICA', allTags);
  const reflectionRaw = extractSection(rawText, 'SPUNTI_RIFLESSIONE', allTags);
  const solutionsRaw = extractSection(rawText, 'SOLUZIONI', allTags);
  const driversRaw = extractSection(rawText, 'DRIVER_EMOTIVI', allTags);

  const reflectionPrompts = extractBulletList(reflectionRaw);
  const solutionSteps = extractBulletList(solutionsRaw);
  const emotionalDrivers = extractBulletList(driversRaw)
    .flatMap((line) => line.split(',').map((item) => item.trim()))
    .filter(Boolean)
    .slice(0, 6);

  const { sources, searchQueries } = extractGroundingSources(groundingMetadata);

  const fallbackMotive =
    coreMotive ||
    rawText.split('\n\n').map((p) => p.trim()).find((p) => p.length > 20) ||
    'Comportamento guidato da un meccanismo di protezione e regolazione interna.';

  return {
    query: query.trim(),
    coreMotive: fallbackMotive,
    psychologicalAnalysis:
      psychologicalAnalysis ||
      (coreMotive ? '' : rawText.trim()) ||
      'Analisi psicologica completata.',
    reflectionPrompts:
      reflectionPrompts.length > 0
        ? reflectionPrompts
        : [
            'Quale emozione precede immediatamente questo comportamento?',
            'Cosa temi possa accadere se agissi in modo diverso in quel momento?',
          ],
    solutionSteps:
      solutionSteps.length > 0
        ? solutionSteps
        : [
            'Nomina il trigger emotivo nel momento in cui emerge, riducendo l’automatismo.',
            'Sostituisci la risposta abituale con una micro-azione di 2 minuti a basso attrito.',
          ],
    patternCategory: normalizePatternCategory(patternRaw),
    emotionalDrivers:
      emotionalDrivers.length > 0 ? emotionalDrivers : ['Stress situazionale', 'Automatismo'],
    sources,
    searchQueries,
  };
}
