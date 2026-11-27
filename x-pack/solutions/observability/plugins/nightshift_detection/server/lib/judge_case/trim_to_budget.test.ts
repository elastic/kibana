/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JUDGE_CASE_SETTINGS } from './constants';
import type { CaseEvidence } from './judge_case_types';
import { trimToBudget } from './trim_to_budget';

const found = (id: string, extra: Partial<CaseEvidence> = {}): CaseEvidence =>
  ({
    id,
    title: `title ${id}`,
    query: `FROM ${id}`,
    result: 'found',
    rows: [{ text: 'x'.repeat(100) }],
    rows_truncated: false,
    cells_truncated: false,
    ...extra,
  } as CaseEvidence);

/** What an item becomes when it is dropped to fit the budget. */
const dropped = (id: string, extra: Partial<CaseEvidence> = {}): CaseEvidence =>
  ({
    id,
    title: `title ${id}`,
    result: 'skipped',
    reason: 'case_budget',
    ...extra,
  } as CaseEvidence);

const sizeOf = (item: CaseEvidence): number => JSON.stringify(item).length;
const sum = (items: CaseEvidence[]): number =>
  items.reduce((total, item) => total + sizeOf(item), 0);

describe('trimToBudget', () => {
  it('leaves evidence that fits unchanged and reports its size', () => {
    const evidence = [found('E1'), found('E2')];

    const result = trimToBudget({ evidence, maxEvidenceChars: 100_000 });

    expect(result.evidence).toBe(evidence);
    expect(result.budget).toEqual({
      max_evidence_chars: 100_000,
      evidence_chars: sum(evidence),
      over_budget: false,
    });
  });

  it('drops members from the last and stops as soon as the evidence fits', () => {
    const evidence = [found('E1'), found('E2'), found('E3'), found('E4')];
    // Exactly what E1, E2, E3 and a dropped E4 take: the first drop is enough.
    const maxEvidenceChars = sum([found('E1'), found('E2'), found('E3'), dropped('E4')]);

    const { evidence: kept, budget } = trimToBudget({ evidence, maxEvidenceChars });

    expect(kept).toEqual([found('E1'), found('E2'), found('E3'), dropped('E4')]);
    expect(budget).toEqual({
      max_evidence_chars: maxEvidenceChars,
      evidence_chars: maxEvidenceChars,
      over_budget: false,
    });
  });

  it('keeps the dropped item’s id, title and earlier_episode, and no query', () => {
    const member = found('E2', { earlier_episode: true });

    const { evidence } = trimToBudget({
      evidence: [found('E1'), member],
      maxEvidenceChars: sum([found('E1')]),
    });

    expect(evidence[1]).toEqual(dropped('E2', { earlier_episode: true }));
  });

  it('never drops E1: when it is over the limit alone, the budget says so', () => {
    const evidence = [found('E1'), found('E2'), found('E3')];

    const { evidence: kept, budget } = trimToBudget({ evidence, maxEvidenceChars: 10 });

    expect(kept).toEqual([found('E1'), dropped('E2'), dropped('E3')]);
    expect(budget).toEqual({
      max_evidence_chars: 10,
      evidence_chars: sum(kept),
      over_budget: true,
    });
  });

  it('drops a member skipped for the cap too, because its query is the larger part', () => {
    const capSkipped = {
      id: 'E2',
      title: 'title E2',
      query: `FROM ${'q'.repeat(500)}`,
      result: 'skipped',
      reason: 'query_cap',
    } as CaseEvidence;

    const { evidence } = trimToBudget({
      evidence: [found('E1'), capSkipped],
      maxEvidenceChars: sum([found('E1')]),
    });

    expect(evidence[1]).toEqual(dropped('E2'));
  });

  it('leaves a member that is already as small as its stub, so it is not counted twice', () => {
    const evidence = [found('E1'), dropped('E2'), found('E3')];

    const { evidence: kept } = trimToBudget({
      evidence,
      maxEvidenceChars: sum([found('E1'), dropped('E2'), dropped('E3')]),
    });

    expect(kept).toEqual([found('E1'), dropped('E2'), dropped('E3')]);
  });

  it.each([0, -1, NaN, 1.5, Infinity])(
    'falls back to the default limit for a maxEvidenceChars of %s',
    (maxEvidenceChars) => {
      const { budget } = trimToBudget({ evidence: [found('E1')], maxEvidenceChars });

      expect(budget.max_evidence_chars).toBe(JUDGE_CASE_SETTINGS.max_evidence_chars);
    }
  );
});
