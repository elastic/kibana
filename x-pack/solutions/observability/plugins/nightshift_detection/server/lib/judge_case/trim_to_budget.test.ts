/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseEvidence, JudgeCase } from './judge_case_types';
import { trimToBudget } from './trim_to_budget';

type BaseCase = Omit<JudgeCase, 'budget'>;
type FoundCaseEvidence = Extract<CaseEvidence, { result: 'found' }>;

const found = (id: string, rowCount: number, cell = 'x'.repeat(40)): FoundCaseEvidence => ({
  id,
  title: `title ${id}`,
  query: `FROM ${id}`,
  result: 'found',
  rows: Array.from({ length: rowCount }, (_, row) => ({ row, text: cell })),
  rows_truncated: false,
  cells_truncated: false,
});

const caseWith = (evidence: CaseEvidence[], signalTitle = 'signal'): BaseCase =>
  ({
    kind: 'join',
    signal: { data: { title: signalTitle } },
    candidates: [],
    alerts: [],
    notes: [],
    evidence,
    omitted: { candidates: 0, members: 0, reasons: 0, alerts: 0, notes: 0 },
    skipped_evidence: { query_cap: 0, case_budget: 0 },
  } as unknown as BaseCase);

/** The size of the whole case once trimmed, as `used_chars` reports it. */
const sizeOf = (judgeCase: BaseCase, evidence: CaseEvidence[], budget: object): number =>
  JSON.stringify({ ...judgeCase, evidence, budget }).length;

const rowsOf = (item: CaseEvidence): number => ('rows' in item ? item.rows.length : -1);

/** An item as the trimmer leaves it after it cut rows: the same, with the flag set. */
const trimmed = (id: string, rowCount: number): FoundCaseEvidence => ({
  ...found(id, rowCount),
  rows_truncated: true,
});

/** An item the trimmer dropped to fit the budget. */
const skipped = (id: string): CaseEvidence => ({
  id,
  title: `title ${id}`,
  result: 'skipped',
  reason: 'case_budget',
});

/** The size of a case holding exactly this evidence, as `used_chars` reports it when untrimmed. */
const measured = (evidence: CaseEvidence[]): number =>
  trimToBudget({ judgeCase: caseWith(evidence), maxChars: 1_000_000 }).budget.used_chars;

/**
 * The few characters the budget object grows by once a case is trimmed (`trimmed: true`, a shorter
 * `max_chars`), far less than a row.
 */
const BUDGET_SLACK = 50;

describe('trimToBudget', () => {
  it('leaves a case under budget unchanged and reports its size', () => {
    const judgeCase = caseWith([found('E1', 5), found('E2', 5)]);

    const { evidence, budget } = trimToBudget({ judgeCase, maxChars: 100_000 });

    expect(evidence).toEqual(judgeCase.evidence);
    expect(budget).toEqual({
      max_chars: 100_000,
      used_chars: sizeOf(judgeCase, evidence, budget),
      trimmed: false,
      over_budget: false,
    });
  });

  it('reports a used_chars equal to the serialized size at every limit around the case size', () => {
    // `over_budget` serializes as `true` (4 characters) or `false` (5) and the case carries its own
    // size, so around one limit the size has no value that agrees with its own flag.
    const judgeCase = caseWith([found('E1', 1)]);
    const size = measured([found('E1', 1)]);

    for (let maxChars = size - 20; maxChars <= size + 5; maxChars++) {
      const { evidence, budget } = trimToBudget({ judgeCase, maxChars });

      expect(budget.used_chars).toBe(sizeOf(judgeCase, evidence, budget));
      if (budget.used_chars > maxChars) {
        expect(budget.over_budget).toBe(true);
      }
    }
  });

  it('counts the fixed parts of the case in used_chars', () => {
    const small = caseWith([found('E1', 1)]);
    const withNotes = { ...small, notes: ['n'.repeat(500)] };

    const first = trimToBudget({ judgeCase: small, maxChars: 100_000 });
    const second = trimToBudget({ judgeCase: withNotes, maxChars: 100_000 });

    expect(second.budget.used_chars - first.budget.used_chars).toBeGreaterThanOrEqual(500);
  });

  it('trims the rows of E2 to En to 2 first and stops when that fits', () => {
    const judgeCase = caseWith([found('E1', 5), found('E2', 5), found('E3', 5)]);
    const maxChars = measured([found('E1', 5), trimmed('E2', 2), trimmed('E3', 2)]) + BUDGET_SLACK;

    const { evidence, budget } = trimToBudget({ judgeCase, maxChars });

    expect(evidence.map(rowsOf)).toEqual([5, 2, 2]);
    expect(evidence.map((item) => 'rows_truncated' in item && item.rows_truncated)).toEqual([
      false,
      true,
      true,
    ]);
    expect(budget).toMatchObject({ trimmed: true, over_budget: false });
  });

  it('trims the rows of E2 to En to 1 when 2 is not enough, leaving E1 alone', () => {
    const judgeCase = caseWith([found('E1', 5), found('E2', 5), found('E3', 5)]);
    const maxChars = measured([found('E1', 5), trimmed('E2', 1), trimmed('E3', 1)]) + BUDGET_SLACK;

    const { evidence, budget } = trimToBudget({ judgeCase, maxChars });

    expect(evidence.map(rowsOf)).toEqual([5, 1, 1]);
    expect(budget.over_budget).toBe(false);
  });

  it('drops members from the last, to a skipped item that keeps its id and title', () => {
    const judgeCase = caseWith([found('E1', 5), found('E2', 5), found('E3', 5), found('E4', 5)]);
    const oneRowEach = trimToBudget({
      judgeCase: caseWith([found('E1', 5), found('E2', 1), found('E3', 1), found('E4', 1)]),
      maxChars: 1_000_000,
    }).budget.used_chars;

    // Fits only once one member is dropped.
    const { evidence, budget } = trimToBudget({ judgeCase, maxChars: oneRowEach - 50 });

    expect(evidence[3]).toEqual({
      id: 'E4',
      title: 'title E4',
      result: 'skipped',
      reason: 'case_budget',
    });
    expect(evidence[2].result).toBe('found');
    expect(budget).toMatchObject({ trimmed: true, over_budget: false });
  });

  it('keeps earlier_episode on a dropped member', () => {
    const member = { ...found('E2', 1), earlier_episode: true } as CaseEvidence;
    const judgeCase = caseWith([found('E1', 1), member]);

    const { evidence } = trimToBudget({ judgeCase, maxChars: 1 });

    expect(evidence[1]).toEqual({
      id: 'E2',
      earlier_episode: true,
      title: 'title E2',
      result: 'skipped',
      reason: 'case_budget',
    });
  });

  it('trims the rows of E1 to 2 only after every member is dropped', () => {
    const judgeCase = caseWith([found('E1', 5), found('E2', 5)]);
    const maxChars = measured([trimmed('E1', 2), skipped('E2')]) + BUDGET_SLACK;

    const { evidence, budget } = trimToBudget({ judgeCase, maxChars });

    expect(evidence[1].result).toBe('skipped');
    expect(rowsOf(evidence[0])).toBe(2);
    expect('rows_truncated' in evidence[0] && evidence[0].rows_truncated).toBe(true);
    expect(budget.over_budget).toBe(false);
  });

  it('cuts every cell to 200 as the last step and flags the items it cut', () => {
    const long = 'y'.repeat(500);
    const judgeCase = caseWith([found('E1', 2, long)]);

    const { evidence, budget } = trimToBudget({ judgeCase, maxChars: 900 });

    const [first] = evidence;
    expect('rows' in first && first.rows.every((row) => String(row.text).length === 200)).toBe(
      true
    );
    expect('cells_truncated' in first && first.cells_truncated).toBe(true);
    expect(budget).toMatchObject({ trimmed: true, over_budget: false });
  });

  it('never drops E1 and reports over_budget when the signal and E1 alone are over', () => {
    const judgeCase = caseWith(
      [found('E1', 2, 'z'.repeat(500)), found('E2', 2)],
      's'.repeat(5_000)
    );

    const { evidence, budget } = trimToBudget({ judgeCase, maxChars: 1_000 });

    expect(evidence[0].result).toBe('found');
    expect(evidence[1].result).toBe('skipped');
    expect(budget.over_budget).toBe(true);
    expect(budget.used_chars).toBeGreaterThan(1_000);
  });

  it('does not touch an E1 that is not found', () => {
    const judgeCase = caseWith([
      { id: 'E1', title: 't', query: 'q', result: 'empty' },
      found('E2', 5),
    ]);

    const { evidence } = trimToBudget({ judgeCase, maxChars: 1 });

    expect(evidence[0]).toEqual({ id: 'E1', title: 't', query: 'q', result: 'empty' });
  });

  it.each([[0], [-5], [1.5], [NaN]])('falls back to 60,000 for maxChars %p', (maxChars) => {
    const { budget } = trimToBudget({ judgeCase: caseWith([found('E1', 1)]), maxChars });

    expect(budget.max_chars).toBe(60_000);
  });
});
