import { PatternCategory, VaultNoteRecord } from '../types/why';

export interface PatternSummary {
  category: PatternCategory;
  count: number;
  percentage: number;
}

export interface TimelinePoint {
  dateLabel: string;
  count: number;
  avgIntensity: number;
}

export interface AwarenessMetrics {
  totalNotes: number;
  toExploreCount: number;
  practicingCount: number;
  integratedCount: number;
  integrationRate: number;
  reflectionDepthRate: number;
  averageIntensity: number;
  topPattern: PatternCategory | null;
  patternBreakdown: PatternSummary[];
  timeline: TimelinePoint[];
}

export function computeAwarenessMetrics(notes: VaultNoteRecord[]): AwarenessMetrics {
  const decryptedNotes = notes.filter((n) => n.decrypted !== null);
  const totalNotes = notes.length;

  let toExploreCount = 0;
  let practicingCount = 0;
  let integratedCount = 0;

  for (const note of notes) {
    if (note.status === 'to_explore') toExploreCount += 1;
    else if (note.status === 'practicing') practicingCount += 1;
    else if (note.status === 'integrated') integratedCount += 1;
  }

  const integrationRate = totalNotes > 0 ? Math.round((integratedCount / totalNotes) * 100) : 0;

  const patternCounts = new Map<PatternCategory, number>();
  let intensitySum = 0;
  let reflectedCount = 0;

  const dayMap = new Map<string, { count: number; intensityTotal: number }>();

  for (const note of decryptedNotes) {
    const payload = note.decrypted!;
    patternCounts.set(
      payload.patternCategory,
      (patternCounts.get(payload.patternCategory) ?? 0) + 1
    );
    const intensity = Math.min(5, Math.max(1, payload.emotionalIntensity || 3));
    intensitySum += intensity;

    if (payload.personalReflection.trim().length >= 10) {
      reflectedCount += 1;
    }

    const dayKey = note.createdAtIso.slice(0, 10);
    const existingDay = dayMap.get(dayKey) ?? { count: 0, intensityTotal: 0 };
    dayMap.set(dayKey, {
      count: existingDay.count + 1,
      intensityTotal: existingDay.intensityTotal + intensity,
    });
  }

  const decryptedCount = decryptedNotes.length;
  const patternBreakdown: PatternSummary[] = Array.from(patternCounts.entries())
    .map(([category, count]) => ({
      category,
      count,
      percentage: decryptedCount > 0 ? Math.round((count / decryptedCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const timeline: TimelinePoint[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([dateKey, agg]) => ({
      dateLabel: dateKey.slice(5),
      count: agg.count,
      avgIntensity: Number((agg.intensityTotal / agg.count).toFixed(1)),
    }));

  return {
    totalNotes,
    toExploreCount,
    practicingCount,
    integratedCount,
    integrationRate,
    reflectionDepthRate:
      decryptedCount > 0 ? Math.round((reflectedCount / decryptedCount) * 100) : 0,
    averageIntensity:
      decryptedCount > 0 ? Number((intensitySum / decryptedCount).toFixed(1)) : 0,
    topPattern: patternBreakdown[0]?.category ?? null,
    patternBreakdown,
    timeline,
  };
}
