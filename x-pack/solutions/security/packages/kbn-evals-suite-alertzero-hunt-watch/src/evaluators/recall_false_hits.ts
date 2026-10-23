/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { InvalidCell } from '../types';
import {
  T2_APPLICABLE,
  classifyHitIds,
  classificationIsTotal,
  seededHitRecallTier1,
  seededHitRecallTier2,
  type IdBucketValue,
} from './clean_validity';
import { invalidCellVerdict, type HuntExample, type HuntRunRecord } from './run_record';

export type { HuntRunRecord } from './run_record';

export const METRICS_EXAMPLE_COUNT = 42; // 14 reports x 3 phases (design v1 §1)

const notApplicable = (explanation: string) => ({
  score: null,
  label: 'n/a',
  explanation,
});

/**
 * Tier 2 skip reasons that abort the run before any model-driven behaviour
 * executed (connector/inference plumbing, report content unavailable, or
 * input scoping). These are infrastructure failures, not recall failures:
 * the cell scores null (INVALID) and drops out of the pooled mean.
 * `tier2_failed` (ambiguous: connector 504 vs model refusal) and
 * `no_tier2_targets` (the model resolved a dataset with no behavioural
 * rows) stay scoreable — both are chargeable to the model as recall 0.
 */
const INFRA_T2_SKIP: ReadonlySet<string> = new Set([
  'no_report_text',
  'no_inference',
  'no_connector',
  'no_inference_plugin',
  'scope_blocked',
  'no_searchable_input',
]);

/**
 * M1 (Tier 1 + Tier 2 separately) and M2 (FalseHitRate) as CODE evaluators
 * over the run records. One example per (report, phase); the evaluator
 * returns null (INVALID cell) on a C1/C2/C3a control failure or a
 * per-batch route violation — the denominator never shrinks silently.
 *
 * M1 applicability: recall is only measured where the report actually
 * requested the thing and the environment can contain it — Tier 1 against the
 * IoC values in the report's own document, Tier 2 against the report's own
 * chain, both in E+ only. Every other cell scores null (not applicable)
 * instead of contributing 0 to a pooled mean.
 */

export const createSeededHitRecallTier1Evaluator = (): Evaluator<HuntExample, HuntRunRecord> => ({
  name: 'HuntWatchSeededHitRecallTier1',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, metadata }) => {
    const invalid = invalidCellVerdict(output, metadata);
    if (invalid) return invalid;
    if (output.phase !== 'E+') {
      return notApplicable(
        'tier 1 recall applies to E+ only: positives are not seeded in this phase'
      );
    }
    // The report's own IoC values scope the denominator: R-ioc asks for its
    // chain's zones; R-beh and narrative decoys carry no IoCs at all.
    const requested = new Set(output.reportIocValues ?? []);
    const plantedIocs = metadata.labels.plantedIocs.filter((p) => requested.has(p.value));
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
        denominator === 0
          ? 'no planted IoCs requested by this report; tier 1 not applicable'
          : null,
    };
  },
});

export const createSeededHitRecallTier2Evaluator = (): Evaluator<HuntExample, HuntRunRecord> => ({
  name: 'HuntWatchSeededHitRecallTier2',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, metadata }) => {
    const invalid = invalidCellVerdict(output, metadata);
    if (invalid) return invalid;
    if (output.phase !== 'E+') {
      return notApplicable(
        'tier 2 recall applies to E+ only: positives are not seeded in this phase'
      );
    }
    // T2 applicability is a fixture-class property (design v3 B1): classes
    // without behavioural text cannot be recalled.
    const applicable = (T2_APPLICABLE as Record<string, boolean>)[output.reportClass] ?? false;
    if (!applicable) {
      return notApplicable(
        `report class ${output.reportClass} carries no behavioural text; tier 2 not applicable`
      );
    }
    // An infra skip (connector/inference plumbing, no report text, scoped-out
    // input) aborted the run before any behaviour executed: the model never
    // got a chance to recall, so the cell is INVALID, not recall 0. Only
    // applies when nothing executed — a partial run with executed behaviours
    // scores on those behaviours whatever the skip flag says.
    const t2Skip = output.run.tier2_skipped_reason;
    const t2Executed = (output.run.behaviours ?? []).some((b) => b.executed);
    if (t2Skip && INFRA_T2_SKIP.has(t2Skip) && !t2Executed) {
      return {
        score: null,
        label: 'INVALID',
        explanation: `tier 2 aborted before any behaviour executed (${t2Skip}); infrastructure failure, not a recall failure`,
      };
    }
    // Only executed behaviours with hits count (design v3 §2: T2-reached).
    const behaviours = (output.run.behaviours ?? [])
      .filter((b) => b.executed)
      .map((b) => ({
        techniqueId: b.technique_id,
        hit: b.hit,
        hitIds: (b.hits ?? []).map((h) => h._id),
      }));
    // Scope the denominator to this report's chain: a report that recalls its
    // own chain's behaviours must not be penalized for other chains' positives.
    const plantedBehaviours = metadata.labels.plantedBehaviours
      .filter((p) => p.chain === output.chain)
      .map((p) => ({
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

export const createFalseHitRateEvaluator = (): Evaluator<HuntExample, HuntRunRecord> => ({
  name: 'HuntWatchFalseHitRate',
  kind: 'CODE',
  direction: 'minimize',
  evaluate: async ({ output, metadata }) => {
    const invalid = invalidCellVerdict(output, metadata);
    if (invalid) return invalid;
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
    // Each hit is classified in its own match context: Tier 1 IoC hits are not
    // technique-scoped (any planted positive doc is true), and each Tier 2
    // behaviour's hits are judged against that behaviour's own technique —
    // never the first behaviour's.
    const groups: Array<{
      hitIds: string[];
      technique: string;
      techniqueIndependentIsTrue: boolean;
    }> = [
      {
        hitIds: output.tier1HitIds,
        technique: '',
        techniqueIndependentIsTrue: true,
      },
      ...(output.run.behaviours ?? [])
        .filter((b) => b.executed)
        .map((b) => ({
          hitIds: (b.hits ?? []).map((h) => h._id),
          technique: b.technique_id ?? '',
          techniqueIndependentIsTrue: false,
        })),
    ];
    // The counting unit is the unique hit id across every group: numerator and
    // denominator must agree, and a doc returned by both tiers counts once.
    const uniqueHitIds = [...new Set(groups.flatMap((g) => g.hitIds))];
    if (uniqueHitIds.length === 0) {
      return { score: null, label: 'no hits; M2 undefined for this run', explanation: null };
    }
    let falseCount = 0;
    let retained = 0;
    try {
      const merged: Record<string, IdBucketValue> = {};
      for (const group of groups.filter((g) => g.hitIds.length > 0)) {
        const classified = classifyHitIds({
          hitIds: group.hitIds,
          technique: group.technique,
          techniqueIndependentIsTrue: group.techniqueIndependentIsTrue,
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
        for (const [id, bucket] of Object.entries(classified)) {
          if (merged[id] === 'true' || bucket === 'true') {
            merged[id] = 'true';
          } else if (bucket === 'twin-retained' || merged[id] === 'twin-retained') {
            merged[id] = 'twin-retained';
          } else {
            merged[id] = 'false';
          }
        }
      }
      if (!classificationIsTotal(uniqueHitIds, merged)) {
        throw new InvalidCell('M2 classification is not total: a hit id fell in no bucket');
      }
      for (const bucket of Object.values(merged)) {
        if (bucket === 'false') falseCount += 1;
        if (bucket === 'twin-retained') retained += 1;
      }
    } catch (e) {
      if (e instanceof InvalidCell) {
        return { score: null, label: 'INVALID', explanation: e.cause };
      }
      throw e;
    }
    const falseFrac = falseCount / uniqueHitIds.length;
    return {
      score: falseFrac,
      label: `M2 false_frac=${falseFrac.toFixed(2)} (retained=${retained})`,
      explanation: null,
    };
  },
});
