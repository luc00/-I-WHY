import test from 'node:test';
import assert from 'node:assert/strict';
import { extractGroundingSources, normalizePatternCategory, parseBehavioralResponse } from './parser';

test('parseBehavioralResponse extracts all structured sections and deduplicates grounding chunks', () => {
  const sampleText = `
[PATTERN]
Evitamento Emotivo

[MOTIVO_MIGLIORE]
Rimandi perché il compito attiva la paura di non essere all'altezza, quindi il cervello sceglie un sollievo immediato.

[ANALISI_PSICOLOGICA]
Secondo le ricerche sulla regolazione emotiva e la procrastinazione cronica, rimandare non è pigrizia ma gestione dello stato d'animo a breve termine.

[SPUNTI_RIFLESSIONE]
- Quale emozione specifica provi 30 secondi prima di aprire quel documento?
- Se il risultato non definisse il tuo valore personale, come inizieresti?

[SOLUZIONI]
1. Applica la regola dei 5 minuti riducendo l'obiettivo a una sola azione visibile.
2. Separa la fase di bozza imperfetta dalla fase di revisione critica.

[DRIVER_EMOTIVI]
Ansia da prestazione, Perfezionismo, Fatica decisionale
`;

  const groundingMetadata = {
    webSearchQueries: ['psychology procrastination emotional regulation'],
    groundingChunks: [
      { web: { uri: 'https://example.org/study-1', title: 'Emotional Regulation & Procrastination' } },
      { web: { uri: 'https://example.org/study-1', title: 'Duplicate URL' } },
      { web: { uri: 'https://example.org/study-2', title: 'Cognitive Behavioral Strategies' } },
    ],
  };

  const parsed = parseBehavioralResponse(
    'Perché rimando sempre i compiti difficili?',
    sampleText,
    groundingMetadata
  );

  assert.equal(parsed.patternCategory, 'Evitamento Emotivo');
  assert.match(parsed.coreMotive, /paura di non essere all'altezza/);
  assert.match(parsed.psychologicalAnalysis, /regolazione emotiva/);
  assert.equal(parsed.reflectionPrompts.length, 2);
  assert.equal(parsed.solutionSteps.length, 2);
  assert.deepEqual(parsed.emotionalDrivers, [
    'Ansia da prestazione',
    'Perfezionismo',
    'Fatica decisionale',
  ]);
  assert.equal(parsed.sources.length, 2);
  assert.equal(parsed.sources[0].title, 'Emotional Regulation & Procrastination');
  assert.deepEqual(parsed.searchQueries, ['psychology procrastination emotional regulation']);
});

test('normalizePatternCategory maps variations accurately and falls back safely', () => {
  assert.equal(normalizePatternCategory('Paura del fallimento e perfezionismo'), 'Paura del Fallimento');
  assert.equal(normalizePatternCategory('Abitudine Automatica'), 'Abitudine Automatica');
  assert.equal(normalizePatternCategory('Categoria sconosciuta'), 'Altro');
});

test('extractGroundingSources ignores invalid or empty chunks', () => {
  const { sources, searchQueries } = extractGroundingSources({
    groundingChunks: [{ web: {} }, { web: { uri: 'https://apa.org/mind' } }],
    webSearchQueries: ['', '  ', 'habit loop psychology'],
  });
  assert.equal(sources.length, 1);
  assert.equal(sources[0].title, 'https://apa.org/mind');
  assert.deepEqual(searchQueries, ['habit loop psychology']);
});
