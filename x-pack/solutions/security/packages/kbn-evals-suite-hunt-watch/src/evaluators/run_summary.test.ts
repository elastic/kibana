/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import type { HuntEvaluator } from './dataset_evaluator';
import {
  assertCodeScoresPass,
  createRunCollector,
  summarizeFailuresByRow,
  withScoreCollection,
  type CodeFailure,
} from './run_summary';

const evaluatorReturning = (
  name: string,
  kind: HuntEvaluator['kind'],
  result: EvaluationResult
): HuntEvaluator => ({
  name,
  kind,
  direction: 'maximize',
  evaluate: async () => result,
});

const params = {
  input: { spaceId: 'default', reportIds: ['ti-report-a'] },
  output: {},
  expected: {},
  metadata: undefined,
} as unknown as Parameters<HuntEvaluator['evaluate']>[0];

const runAll = async (evaluators: HuntEvaluator[], metadata?: Record<string, unknown>) => {
  const collector = createRunCollector();
  for (const evaluator of withScoreCollection(evaluators, collector)) {
    await evaluator.evaluate({ ...params, metadata } as typeof params);
  }
  return collector;
};

describe('withScoreCollection', () => {
  it.each([
    ['a CODE score of 0', 'CODE', { score: 0, explanation: 'outcome "partial"' }, 1],
    ['a MISSING CODE result', 'CODE', { score: null, label: 'MISSING' }, 1],
    ['an N/A CODE result', 'CODE', { score: null, label: 'N/A' }, 0],
    ['a passing CODE score', 'CODE', { score: 1 }, 0],
    ['a low LLM score', 'LLM', { score: 0.4 }, 0],
  ] as const)('records %s as %d CODE failure(s)', async (_name, kind, result, count) => {
    const collector = await runAll([evaluatorReturning('Outcome Label', kind, result)]);
    expect(collector.codeFailures).toHaveLength(count);
  });

  it('names the row a CODE failure came from', async () => {
    const collector = await runAll([
      evaluatorReturning('Outcome Label', 'CODE', { score: 0, explanation: 'outcome "partial"' }),
    ]);
    expect(collector.codeFailures[0]).toEqual({
      evaluator: 'Outcome Label',
      row: 'default: ti-report-a',
      score: 0,
      label: undefined,
      explanation: 'outcome "partial"',
    });
  });

  it('records the row gate tag from example metadata', async () => {
    const collector = await runAll([evaluatorReturning('Outcome Label', 'CODE', { score: 0 })], {
      gate: 'capability',
    });
    expect(collector.codeFailures[0].gate).toBe('capability');
  });

  it('leaves the gate unset on an untagged row', async () => {
    const collector = await runAll([evaluatorReturning('Outcome Label', 'CODE', { score: 0 })]);
    expect(collector.codeFailures[0]).not.toHaveProperty('gate');
  });

  it('records every score in the sink regardless of kind or label', async () => {
    const collector = await runAll([
      evaluatorReturning('Outcome Label', 'CODE', { score: 1 }),
      evaluatorReturning('Outcome Label', 'CODE', { score: null, label: 'N/A' }),
    ]);
    expect(collector.scores.get('Outcome Label')).toEqual([1, null]);
  });
});

describe('assertCodeScoresPass', () => {
  it('returns without throwing when there are no CODE failures', () => {
    expect(() => assertCodeScoresPass('golden', [])).not.toThrow();
  });

  it('throws naming every failing evaluator and row', () => {
    expect(() =>
      assertCodeScoresPass('golden', [
        { evaluator: 'Outcome Label', row: 'default: a', score: 0, explanation: 'bad outcome' },
        { evaluator: 'SSE Attachment', row: 'default: b', score: null, label: 'MISSING' },
      ])
    ).toThrow(
      /Outcome Label \[default: a\]: 0 \(bad outcome\)[\s\S]*SSE Attachment \[default: b\]: MISSING/
    );
  });

  const capabilityMiss: CodeFailure = {
    evaluator: 'Outcome Label',
    row: 'default: hit',
    gate: 'capability',
    score: 0,
    explanation: 'hit: outcome "partial", expected one of [completed]',
  };
  const invariantMiss: CodeFailure = {
    evaluator: 'Index Scope Gate',
    row: 'default: scope',
    score: 0,
    explanation: 'scope gate did not short-circuit',
  };
  const newLog = () => ({ warning: jest.fn() } as unknown as ToolingLog & { warning: jest.Mock });

  it('reports and does not gate a capability miss for a non-reference model', () => {
    const log = newLog();
    expect(() =>
      assertCodeScoresPass('golden', [capabilityMiss], { gatesCapability: false, log })
    ).not.toThrow();
    expect(log.warning).toHaveBeenCalledWith(
      expect.stringContaining('1 CODE miss(es) on capability rows, reported and not gated')
    );
  });

  it('gates a capability miss for a reference model', () => {
    const log = newLog();
    expect(() =>
      assertCodeScoresPass('golden', [capabilityMiss], { gatesCapability: true, log })
    ).toThrow(/golden: 1 CODE evaluator miss/);
    expect(log.warning).not.toHaveBeenCalled();
  });

  it('gates capability rows when no option is passed', () => {
    expect(() => assertCodeScoresPass('golden', [capabilityMiss])).toThrow(/1 CODE evaluator/);
  });

  it('gates an untagged miss for every model', () => {
    const log = newLog();
    expect(() =>
      assertCodeScoresPass('golden', [capabilityMiss, invariantMiss], {
        gatesCapability: false,
        log,
      })
    ).toThrow(/golden: 1 CODE evaluator miss[\s\S]*Index Scope Gate \[default: scope\]/);
    expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('[default: hit]'));
  });
});

describe('summarizeFailuresByRow', () => {
  it('collapses correlated misses into one line naming the coordinator status', () => {
    const row = 'default: ti-report-aws-iam-behavior-only-historic-02';
    const lines = summarizeFailuresByRow([
      { evaluator: 'Outcome Label', row, score: 0, explanation: 'x: outcome "partial"' },
      {
        evaluator: 'Evidence Honesty',
        row,
        score: 0,
        explanation: 'x: evidence written=false (coordinator incomplete_retryable, hunt partial)',
      },
      { evaluator: 'Tier 2 Execution', row, score: 0, explanation: 'x: tier2 executed=false' },
    ]);
    expect(lines).toEqual([
      `  [${row}] 3 miss(es), root cause: coordinator incomplete_retryable: Outcome Label, Evidence Honesty, Tier 2 Execution`,
    ]);
  });

  it('falls back to the outcome label, then to no cause', () => {
    expect(
      summarizeFailuresByRow([
        { evaluator: 'Outcome Label', row: 'a', score: 0, explanation: 'outcome "failed"' },
        { evaluator: 'SSE Attachment', row: 'b', score: null, label: 'MISSING' },
      ])
    ).toEqual([
      '  [a] 1 miss(es), root cause: outcome failed: Outcome Label',
      '  [b] 1 miss(es): SSE Attachment',
    ]);
  });
});
