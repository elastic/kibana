/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JUDGE_CASE_SETTINGS } from './constants';
import { cutText } from './cut_text';
import type { EvidenceCell, EvidenceRow } from './evidence_types';
import type { CaseBudget, CaseEvidence, CaseSkippedEvidence, JudgeCase } from './judge_case_types';

export interface TrimToBudgetParams {
  /** The case with its evidence as read; its `budget` is not read. */
  judgeCase: Omit<JudgeCase, 'budget'>;
  /** The size budget; a value that is not a positive integer falls back to the default. */
  maxChars?: number;
}

export interface TrimToBudgetResult {
  evidence: CaseEvidence[];
  budget: CaseBudget;
}

type Evidence = CaseEvidence;
type FoundItem = Extract<Evidence, { result: 'found' }>;

/** The evidence list and whether a step changed it. */
interface Step {
  evidence: Evidence[];
  changed: boolean;
}

const resolveMaxChars = (maxChars: number | undefined): number =>
  maxChars !== undefined && Number.isInteger(maxChars) && maxChars > 0
    ? maxChars
    : JUDGE_CASE_SETTINGS.max_chars;

const isFound = (item: Evidence): item is FoundItem => item.result === 'found';

/** How many items were not read, by why. */
export const countSkippedEvidence = (evidence: CaseEvidence[]): CaseSkippedEvidence => ({
  query_cap: evidence.filter((item) => item.result === 'skipped' && item.reason === 'query_cap')
    .length,
  case_budget: evidence.filter((item) => item.result === 'skipped' && item.reason === 'case_budget')
    .length,
});

/** The size of the serialized case, and whether it is over the limit. */
interface Measure {
  used: number;
  over: boolean;
}

/**
 * The size of the same case with `evidence`, as the judge reads it. The case carries its own size
 * and whether that is over, so the size is settled once per value of the flag: with the flag
 * fixed, only the digit count of `used_chars` varies, and that converges. It is over when the case
 * does not fit with the flag `false`, the longer form. At the one size where it fits only with the
 * flag `true`, it is still reported over, and `used` is then exactly the serialized length.
 */
const measure = (
  judgeCase: Omit<JudgeCase, 'budget'>,
  evidence: Evidence[],
  budget: Omit<CaseBudget, 'used_chars' | 'over_budget'>
): Measure => {
  const sizeWith = (used: number, over: boolean): number =>
    JSON.stringify({
      ...judgeCase,
      evidence,
      skipped_evidence: countSkippedEvidence(evidence),
      budget: { ...budget, used_chars: used, over_budget: over },
    }).length;
  const settle = (over: boolean): number => {
    let used = sizeWith(0, over);
    for (let pass = 0; pass < 4; pass++) {
      const next = sizeWith(used, over);
      if (next === used) {
        return used;
      }
      used = next;
    }
    return used;
  };
  const whole = settle(false);
  return whole <= budget.max_chars
    ? { used: whole, over: false }
    : { used: settle(true), over: true };
};

/** Keeps the first `maxRows` rows of every member item (E2 to En) that has more. */
const trimMemberRows = (evidence: Evidence[], maxRows: number): Step => {
  let changed = false;
  const next = evidence.map((item, index) => {
    if (index === 0 || !isFound(item) || item.rows.length <= maxRows) {
      return item;
    }
    changed = true;
    return { ...item, rows: item.rows.slice(0, maxRows), rows_truncated: true };
  });
  return { evidence: next, changed };
};

/** Replaces the item with a skipped one that keeps only what says what it was. */
const dropped = (item: Evidence): Evidence => ({
  id: item.id,
  ...(item.earlier_episode ? { earlier_episode: item.earlier_episode } : {}),
  title: item.title,
  result: 'skipped',
  reason: 'case_budget',
});

const trimE1Rows = (evidence: Evidence[], maxRows: number): Step => {
  const [first, ...rest] = evidence;
  if (!first || !isFound(first) || first.rows.length <= maxRows) {
    return { evidence, changed: false };
  }
  return {
    evidence: [{ ...first, rows: first.rows.slice(0, maxRows), rows_truncated: true }, ...rest],
    changed: true,
  };
};

const trimCells = (evidence: Evidence[], maxLength: number): Step => {
  let changed = false;
  const trimCell = (cell: EvidenceCell): { cell: EvidenceCell; cut: boolean } => {
    if (typeof cell !== 'string' || cell.length <= maxLength) {
      return { cell, cut: false };
    }
    return { cell: cutText(cell, maxLength).text, cut: true };
  };
  const next = evidence.map((item) => {
    if (!isFound(item)) {
      return item;
    }
    let itemCut = false;
    const rows = item.rows.map((row) => {
      const trimmed: EvidenceRow = {};
      for (const [column, value] of Object.entries(row)) {
        const { cell, cut } = trimCell(value);
        trimmed[column] = cell;
        itemCut = itemCut || cut;
      }
      return trimmed;
    });
    if (!itemCut) {
      return item;
    }
    changed = true;
    return { ...item, rows, cells_truncated: true };
  });
  return { evidence: next, changed };
};

/**
 * Brings the case within `maxChars` by reducing its evidence only, one step at a time, stopping as
 * soon as it fits: rows of E2 to En to 2, to 1, E2 to En dropped from the last, rows of E1 to 2,
 * every cell to the trimmed length. E1 is never dropped. The size is that of the whole serialized
 * case, and the signal, candidates, alerts and notes are not trimmed, so a case can end
 * `over_budget` when those and E1 alone are over `maxChars`.
 */
export const trimToBudget = ({ judgeCase, maxChars }: TrimToBudgetParams): TrimToBudgetResult => {
  const limit = resolveMaxChars(maxChars);
  let evidence = judgeCase.evidence;
  let trimmed = false;
  const sizeNow = (): Measure => measure(judgeCase, evidence, { max_chars: limit, trimmed });
  const apply = (step: Step): void => {
    evidence = step.evidence;
    trimmed = trimmed || step.changed;
  };

  const steps: Array<() => void> = [
    () => apply(trimMemberRows(evidence, 2)),
    () => apply(trimMemberRows(evidence, 1)),
    () => {
      // One member at a time from the last: the first one that makes the case fit stops it.
      for (let index = evidence.length - 1; index >= 1 && sizeNow().over; index--) {
        const item = evidence[index];
        if (item.result === 'skipped' && item.reason === 'case_budget') {
          continue;
        }
        const next = [...evidence];
        next[index] = dropped(item);
        apply({ evidence: next, changed: true });
      }
    },
    () => apply(trimE1Rows(evidence, 2)),
    () => apply(trimCells(evidence, JUDGE_CASE_SETTINGS.trimmed_cell_length)),
  ];

  for (const step of steps) {
    if (!sizeNow().over) {
      break;
    }
    step();
  }

  const { used, over } = sizeNow();
  return {
    evidence,
    budget: { max_chars: limit, used_chars: used, trimmed, over_budget: over },
  };
};
