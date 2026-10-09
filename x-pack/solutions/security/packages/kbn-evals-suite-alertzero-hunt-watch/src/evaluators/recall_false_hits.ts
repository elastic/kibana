/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { CoordinatorRun } from '../types';
import { InvalidCell } from '../types';
import { classifyHitIds, seededHitRecallTier1, seededHitRecallTier2 } from './clean_validity';
import type { CorpusLabels } from '../datasets/labels';

/** What the harness records per report-run for the code evaluators. */
export interface HuntRunRecord {
  runKey: string;
  phase: 'E0' | 'E+' | 'E-';
  reportClass: string;
  sampleBase?: string;
  /** Coordinator output read from the run_hunt_coordinator step output. */
  run: CoordinatorRun;
  /** seeded hit `_id`s (ES _id space), per tier. */
  tier1HitIds: string[];
  tier2HitIds: string[];
  tier1MatchedIocs?: Array<{ value: string; hitIds: string[] }>;
}

const METRICS_EXAMPLE_COUNT = 42; // 14 reports x 3 phases (design v1 §1)

/**
 * M1 (Tier 1 + Tier 2 separately) and M2 (FalseHitRate) as CODE evaluators
 * over the run records. One example per (report, phase); the evaluator
 * returns null (INVALID cell) on a C1/C2/C3a control failure or a
 * per-batch route violation — the denominator never shrinks silently.
 */

export const createSeededHitRecallTier1Evaluator = (): Evaluator<
  { output: HuntRunRecord; metadata: { labels: CorpusLabels } },
  HuntRunRecord
> => ({
  name: 'HuntWatchSeededHitRecallTier1',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, metadata }) => {
    const plantedIocs = metadata.labels.plantedIocs;
    const matchedIocs = (output.tier1MatchedIocs ?? []).map((m) => ({
      value: m.value,
      hitIds: m.hitIds,
    }));
    const { recall, denominator } = seededHitRecallTier1({
      matchedIocs,
      plantedIocs,
    });
    return {
      score: denominator === 0 ? null : (recall as number),
      label: `M1-T1 recall=${recall?.toFixed(2) ?? 'n/a'} (${matchedIocs.length}/${denominator})`,
      explanation:
        denominator === 0 ? 'no planted IoCs in this class; tier 1 not applicable' : null,
    };
  },
});

export const createSeededHitRecallTier2Evaluator = (): Evaluator<
  { output: HuntRunRecord; metadata: { labels: CorpusLabels } },
  HuntRunRecord
> => ({
  name: 'HuntWatchSeededHitRecallTier2',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, metadata }) => {
    // Only executed behaviours with hits count (design v3 §2: T2-reached).
    const behaviours = (output.run.behaviours ?? [])
      .filter((b) => b.executed)
      .map((b) => ({
        techniqueId: b.technique_id,
        hit: b.hit,
        hitIds: (b.hits ?? []).map((h) => h._id),
      }));
    const plantedBehaviours = metadata.labels.plantedBehaviours.map((p) => ({
      techniques: p.techniques,
      positiveDocIds: p.positiveDocIds,
    }));
    const { recall, denominator } = seededHitRecallTier2({ behaviours, plantedBehaviours });
    return {
      score: denominator === 0 ? null : (recall as number),
      label: `M1-T2 recall=${recall?.toFixed(2) ?? 'n/a'} (${
        behaviours.filter((b) => b.hit).length
      } hit behaviours)`,
      explanation: denominator === 0 ? 'no planted behaviours for this record' : null,
    };
  },
});

export const createFalseHitRateEvaluator = (): Evaluator<
  {
    output: HuntRunRecord;
    metadata: {
      labels: CorpusLabels;
      noise: string[];
      twinChanged: string[];
      twinRetained: string[];
      foreign: string[];
      fixture: string[];
    };
  },
  HuntRunRecord
> => ({
  name: 'HuntWatchFalseHitRate',
  kind: 'CODE',
  direction: 'minimize',
  evaluate: async ({ output, metadata }) => {
    const { labels } = metadata;
    const planted = (base: string): Set<string> => {
      // positive doc ids of one sample, in the seeded-id space
      const prefix = base;
      return new Set(
        labels.plantedBehaviours
          .filter((p) => p.chain === labels.chainOf[prefix])
          .flatMap((p) => p.positiveDocIds.filter((id) => id.startsWith(`${prefix}#`)))
      );
    };
    const hitIds = [...output.tier1HitIds, ...output.tier2HitIds];
    if (hitIds.length === 0) {
      return { score: null, label: 'no hits; M2 undefined for this run', explanation: null };
    }
    let falseCount = 0;
    let retained = 0;
    const technique = output.run.behaviours?.[0]?.technique_id ?? '';
    try {
      const classified = classifyHitIds({
        hitIds,
        technique,
        target: output.sampleBase,
        chainOf: labels.chainOf,
        techOf: labels.techOf,
        planted,
        buckets: {
          noise: new Set(metadata.noise),
          twinChanged: new Set(metadata.twinChanged),
          twinRetained: new Set(metadata.twinRetained),
          foreign: new Set(metadata.foreign),
          fixture: new Set(metadata.fixture),
        },
      });
      for (const bucket of Object.values(classified)) {
        if (bucket === 'false') falseCount += 1;
        if (bucket === 'twin-retained') retained += 1;
      }
    } catch (e) {
      if (e instanceof InvalidCell) {
        return { score: null, label: 'INVALID', explanation: e.cause };
      }
      throw e;
    }
    const falseFrac = falseCount / hitIds.length;
    return {
      score: falseFrac,
      label: `M2 false_frac=${falseFrac.toFixed(2)} (retained=${retained})`,
      explanation: null,
    };
  },
});

export { METRICS_EXAMPLE_COUNT };
