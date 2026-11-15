import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAwarenessMetrics } from './awareness';
import { VaultNoteRecord } from '../types/why';

function makeNote(
  id: string,
  status: VaultNoteRecord['status'],
  patternCategory: NonNullable<VaultNoteRecord['decrypted']>['patternCategory'],
  emotionalIntensity: number,
  createdAtIso: string,
  personalReflection = ''
): VaultNoteRecord {
  return {
    id,
    status,
    createdAtIso,
    updatedAtIso: createdAtIso,
    encrypted: { ciphertext: 'cipher_placeholder_1234', iv: 'iv_placeholder', keyVersion: 1 },
    decrypted: {
      id,
      behaviorQuery: `Domanda ${id}`,
      coreMotive: 'Motivo',
      psychologicalAnalysis: 'Analisi',
      reflectionPrompts: ['Spunto 1'],
      solutionSteps: ['Soluzione 1'],
      solutionRequested: true,
      personalReflection,
      patternCategory,
      emotionalIntensity,
      sources: [],
      createdAtIso,
      updatedAtIso: createdAtIso,
    },
  };
}

test('computeAwarenessMetrics handles empty vault safely', () => {
  const metrics = computeAwarenessMetrics([]);
  assert.equal(metrics.totalNotes, 0);
  assert.equal(metrics.integrationRate, 0);
  assert.equal(metrics.topPattern, null);
  assert.deepEqual(metrics.patternBreakdown, []);
});

test('computeAwarenessMetrics computes status rates, top pattern, and intensity timeline', () => {
  const notes: VaultNoteRecord[] = [
    makeNote('1', 'integrated', 'Evitamento Emotivo', 4, '2026-11-10T10:00:00Z', 'Ho applicato la regola dei 5 minuti con successo.'),
    makeNote('2', 'practicing', 'Evitamento Emotivo', 2, '2026-11-10T18:00:00Z', 'Sto ancora osservando il trigger serale.'),
    makeNote('3', 'to_explore', 'Bisogno di Controllo', 5, '2026-11-12T09:00:00Z', ''),
    makeNote('4', 'integrated', 'Abitudine Automatica', 3, '2026-11-14T12:00:00Z', 'Ho cambiato ambiente prima di iniziare.'),
  ];

  const metrics = computeAwarenessMetrics(notes);
  assert.equal(metrics.totalNotes, 4);
  assert.equal(metrics.integratedCount, 2);
  assert.equal(metrics.practicingCount, 1);
  assert.equal(metrics.toExploreCount, 1);
  assert.equal(metrics.integrationRate, 50);
  assert.equal(metrics.reflectionDepthRate, 75);
  assert.equal(metrics.averageIntensity, 3.5);
  assert.equal(metrics.topPattern, 'Evitamento Emotivo');
  assert.equal(metrics.patternBreakdown[0].percentage, 50);
  assert.equal(metrics.timeline.length, 3);
  assert.deepEqual(metrics.timeline[0], {
    dateLabel: '11-10',
    count: 2,
    avgIntensity: 3,
  });
});
