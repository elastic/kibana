/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { CoordinatorRun, ReportClass } from '../types';
import { InvalidCell } from '../types';
import { techniqueRelated } from '../datasets/labels';

/**
 * Applicability of each tier per report class — a property of the report FIXTURE
 * class, never of SUT output (design v3 B1, v6 §2). Mirrors isTier1SearchableIoc
 * / behavioural-text presence at the pin.
 */
export const T1_APPLICABLE: Record<ReportClass, boolean> = {
  'R-ioc': true,
  'R-decoy(a)': true,
  'R-beh-A': false,
  'R-decoy(bcd)-A': false,
  'R-beh-B': true,
};

/** Rev 5 [R4-B1]: Tier 2 applicability is behavioural text only. */
export const T2_APPLICABLE: Record<ReportClass, boolean> = {
  'R-ioc': false,
  'R-decoy(a)': false,
  'R-beh-A': true,
  'R-decoy(bcd)-A': true,
  'R-beh-B': true,
};

const T1_REACHED_STATUSES: ReadonlySet<string> = new Set([
  'no_environment_hits',
  'environment_hits_found',
]);

/** Tier 1 gaps that mean "never searched" (hunt_for_threat.ts at the pin). */
export const T1_UNSEARCHED_GAPS: ReadonlySet<string> = new Set([
  'search_partial',
  'index_unavailable',
]);

export interface M3Options {
  t1Applicable?: Record<ReportClass, boolean>;
  t2Applicable?: Record<ReportClass, boolean>;
  /** MUTANT hooks mirroring rev7_check.py; defaults are the shipped behaviour. */
  applicabilityFromSut?: boolean;
  t1ReachedStatusOnly?: boolean;
  ignoreCompleteness?: boolean;
  defaultMissing?: boolean;
}

export interface M3Result {
  verdict: 'clean' | 'incomplete' | 'false-hit';
  reason?: string;
}

const t1GapsHaveUnsearched = (gaps: Iterable<string>): boolean => {
  for (const g of gaps) if (T1_UNSEARCHED_GAPS.has(g)) return true;
  return false;
};

/**
 * M3 CleanValidity (design v6 §2 + rev7_check.py `m3`). `completeness` is read
 * off the wire and never re-derived from gap reasons; a missing field is an
 * INVALID cell (N3), never defaulted.
 */
export const m3Verdict = (
  cls: ReportClass,
  run: CoordinatorRun,
  opts: M3Options = {}
): M3Result => {
  const t1Gaps = run.tier1_incomplete ?? [];
  const t1Reached =
    T1_REACHED_STATUSES.has(run.tier1_status) &&
    (opts.t1ReachedStatusOnly === true || !t1GapsHaveUnsearched(t1Gaps));
  const t2Reached = run.behaviours.some((b) => b.executed);
  const hit =
    run.tier1_status === 'environment_hits_found' ||
    run.behaviours.some((b) => b.executed && b.hit);

  let needT1: boolean;
  let needT2: boolean;
  if (opts.applicabilityFromSut) {
    needT1 = run.tier1_status !== 'no_searchable_terms';
    needT2 = true;
  } else {
    needT1 = (opts.t1Applicable ?? T1_APPLICABLE)[cls];
    needT2 = (opts.t2Applicable ?? T2_APPLICABLE)[cls];
  }

  if (hit) return { verdict: 'false-hit' }; // any hit in any tier, T2-optional tiers included
  if ((needT1 && !t1Reached) || (needT2 && !t2Reached)) {
    return {
      verdict: 'incomplete',
      reason: needT1 && !t1Reached ? 't1_not_reached' : 't2_not_reached',
    };
  }
  // [R5-B1] T2-optional classes: clean needs the coordinator's completeness == 'complete'.
  if (!needT2 && !opts.ignoreCompleteness) {
    if (run.completeness === undefined && !opts.defaultMissing) {
      // [N3] explicit INVALID cell, never defaulted.
      throw new InvalidCell('missing_completeness: wire response carries no completeness field');
    }
    if ((run.completeness ?? 'complete') !== 'complete') {
      return { verdict: 'incomplete', reason: run.completeness };
    }
  }
  return { verdict: 'clean' };
};

/**
 * M3 as a @kbn/evals CODE evaluator over the E0 phase: score 1 = clean,
 * 0 = incomplete/false-hit, null = INVALID cell (excluded, never defaulted).
 */
export const createCleanValidityEvaluator = (): Evaluator<
  { output: CoordinatorRun; metadata: { report_class: ReportClass } },
  CoordinatorRun
> => ({
  name: 'HuntWatchCleanValidity',
  kind: 'CODE',
  direction: 'neutral',
  evaluate: async ({ output, metadata }) => {
    let result: M3Result;
    try {
      result = m3Verdict(metadata.report_class, output);
    } catch (e) {
      if (e instanceof InvalidCell) {
        return { score: null, label: 'INVALID', explanation: e.cause };
      }
      throw e;
    }
    return {
      score: result.verdict === 'clean' ? 1 : 0,
      label: result.verdict,
      explanation: result.reason ?? null,
    };
  },
});

/**
 * M1 SeededHitRecall (design v1 §2), deterministic. Tier 1 and Tier 2 are
 * computed separately and never pooled.
 */
export interface M1Tier1Input {
  /** matched.ioc values the coordinator reported, with their hit _ids. */
  matchedIocs: Array<{ value: string; hitIds: string[] }>;
  plantedIocs: Array<{ value: string; docIds: string[] }>;
}

export const seededHitRecallTier1 = ({
  matchedIocs,
  plantedIocs,
}: M1Tier1Input): { recall: number | null; denominator: number; matched: string[] } => {
  const hitIdsByValue = new Map(matchedIocs.map((m) => [m.value, m.hitIds]));
  const matched = plantedIocs.filter(
    (p) =>
      hitIdsByValue.has(p.value) &&
      (hitIdsByValue.get(p.value) ?? []).some((id) => p.docIds.includes(id))
  );
  const denominator = plantedIocs.length;
  return {
    // [NB-8] null on zero denominator, matching Tier 2.
    recall: denominator === 0 ? null : matched.length / denominator,
    denominator,
    matched: matched.map((m) => m.value),
  };
};

export interface M1Tier2Input {
  /** executed Tier 2 behaviours with technique ids and hit _ids. */
  behaviours: Array<{ techniqueId?: string; hit: boolean; hitIds: string[] }>;
  plantedBehaviours: Array<{ techniques: string[]; positiveDocIds: string[] }>;
}

export const seededHitRecallTier2 = ({
  behaviours,
  plantedBehaviours,
}: M1Tier2Input): { recall: number | null; denominator: number } => {
  const recalled = plantedBehaviours.filter((planted) =>
    behaviours.some(
      (b) =>
        b.hit &&
        b.techniqueId !== undefined &&
        planted.techniques.some((t) => techniqueRelated(t, b.techniqueId as string)) &&
        b.hitIds.some((id) => planted.positiveDocIds.includes(id))
    )
  );
  const denominator = plantedBehaviours.length;
  // [NB-8] Zero denominator means "not applicable", not "recalled nothing":
  // null, never 0 (0 would drag a pooled mean down with cells that measure
  // nothing).
  return { recall: denominator === 0 ? null : recalled.length / denominator, denominator };
};

/**
 * M2 hit-id classification (design v3 NB-a): every hit id lands in exactly one
 * bucket or the cell is INVALID. The true-id set is the chain-agnostic union
 * (design v4): a planted doc of ANY chain counts as true for a matched
 * technique, which is what makes same-chain decoys observable.
 */
export interface M2ClassifyInput {
  hitIds: string[];
  technique: string;
  /** sample base of the report under evaluation, for the same-chain mutant only. */
  target?: string;
  chainOf: Record<string, string>;
  techOf: Record<string, string[]>;
  /** sample base -> set of positive doc ids for that sample. */
  planted: (sampleBase: string) => Set<string>;
  buckets: {
    noise?: ReadonlySet<string>;
    twinChanged?: ReadonlySet<string>;
    twinRetained?: ReadonlySet<string>;
    foreign?: ReadonlySet<string>;
    fixture?: ReadonlySet<string>;
  };
  /** MUTANT hook (rev7 R3-B2): restrict true ids to OTHER chains. */
  crossChainOnly?: boolean;
}

export type IdBucketValue = 'true' | 'false' | 'twin-retained';

export const classifyHitIds = ({
  hitIds,
  technique,
  target,
  chainOf,
  techOf,
  planted,
  buckets,
  crossChainOnly = false,
}: M2ClassifyInput): Record<string, IdBucketValue> => {
  const trueSet = new Set<string>();
  const unrestrictedMatched = new Set<string>();
  for (const prefix of Object.keys(chainOf)) {
    if ((techOf[prefix] ?? []).some((k) => techniqueRelated(technique, k))) {
      for (const id of planted(prefix)) {
        unrestrictedMatched.add(id);
        if (!crossChainOnly || chainOf[prefix] !== chainOf[target ?? '']) trueSet.add(id);
      }
    }
  }
  const allPlanted = new Set<string>();
  for (const prefix of Object.keys(chainOf)) for (const id of planted(prefix)) allPlanted.add(id);

  const out: Record<string, IdBucketValue> = {};
  for (const id of hitIds) {
    if (trueSet.has(id)) {
      out[id] = 'true';
    } else if (
      buckets.noise?.has(id) ||
      buckets.twinChanged?.has(id) ||
      buckets.foreign?.has(id) ||
      buckets.fixture?.has(id)
    ) {
      out[id] = 'false'; // fixture (TI indicator doc) is false: it is not telemetry
    } else if (allPlanted.has(id) && !unrestrictedMatched.has(id)) {
      out[id] = 'false'; // off-technique planted (off-technique is judged on the unrestricted matcher)
    } else if (buckets.twinRetained?.has(id)) {
      out[id] = 'twin-retained';
    } else {
      throw new InvalidCell(`unclassified hit id ${id}: labels bug`);
    }
  }
  return out;
};

/** M2 totality: every classified id is accounted for. */
export const classificationIsTotal = (classified: Record<string, IdBucketValue>): boolean =>
  Object.values(classified).every((v) => v !== undefined);
