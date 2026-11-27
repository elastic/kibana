/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JUDGE_CASE_SETTINGS } from './constants';
import type { CaseBudget, CaseEvidence, CaseSkippedEvidence } from './judge_case_types';

export interface TrimToBudgetParams {
  /** The evidence of one case, E1 first. */
  evidence: CaseEvidence[];
  /** The evidence size limit in characters; a value that is not a positive integer falls back to the default. */
  maxEvidenceChars?: number;
}

export interface TrimToBudgetResult {
  evidence: CaseEvidence[];
  budget: CaseBudget;
}

const resolveMaxEvidenceChars = (maxEvidenceChars: number | undefined): number =>
  maxEvidenceChars !== undefined && Number.isInteger(maxEvidenceChars) && maxEvidenceChars > 0
    ? maxEvidenceChars
    : JUDGE_CASE_SETTINGS.max_evidence_chars;

/** The serialized size of one evidence item, the unit the budget counts in. */
const sizeOf = (item: CaseEvidence): number => JSON.stringify(item).length;

/** How many items were not read, by why. */
export const countSkippedEvidence = (evidence: CaseEvidence[]): CaseSkippedEvidence => ({
  query_cap: evidence.filter((item) => item.result === 'skipped' && item.reason === 'query_cap')
    .length,
  case_budget: evidence.filter((item) => item.result === 'skipped' && item.reason === 'case_budget')
    .length,
});

/** Replaces the item with a skipped one that keeps only what says what it was. */
const dropped = (item: CaseEvidence): CaseEvidence => ({
  id: item.id,
  ...(item.earlier_episode ? { earlier_episode: item.earlier_episode } : {}),
  title: item.title,
  result: 'skipped',
  reason: 'case_budget',
});

/**
 * Keeps the evidence within `maxEvidenceChars` by dropping members from the last, stopping as soon
 * as it fits. Candidates arrive best first, so the last members are the weakest evidence. E1 is
 * never dropped, so the budget is `over_budget` when E1 alone is over the limit.
 *
 * Each item is serialized once and the total is kept as a running sum, so the cost is one pass over
 * the evidence however many members are dropped, and none when it already fits.
 */
export const trimToBudget = ({
  evidence,
  maxEvidenceChars,
}: TrimToBudgetParams): TrimToBudgetResult => {
  const limit = resolveMaxEvidenceChars(maxEvidenceChars);
  const sizes = evidence.map(sizeOf);
  let used = sizes.reduce((total, size) => total + size, 0);
  if (used <= limit) {
    return {
      evidence,
      budget: { max_evidence_chars: limit, evidence_chars: used, over_budget: false },
    };
  }

  const kept = [...evidence];
  for (let index = kept.length - 1; index >= 1 && used > limit; index--) {
    const stub = dropped(kept[index]);
    const stubSize = sizeOf(stub);
    // An item that is already as small as its stub, such as a member dropped before, gains nothing.
    if (stubSize >= sizes[index]) {
      continue;
    }
    used += stubSize - sizes[index];
    kept[index] = stub;
  }
  return {
    evidence: kept,
    budget: { max_evidence_chars: limit, evidence_chars: used, over_budget: used > limit },
  };
};
