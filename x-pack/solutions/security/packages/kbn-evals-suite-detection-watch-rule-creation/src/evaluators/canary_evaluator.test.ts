/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEvaluators } from '@kbn/evals';
import type { RuleCreationResult } from '../rule_creation_client';
import { createCanaryEvaluator } from './canary_evaluator';

const makeEvaluators = (gapScore: number): DefaultEvaluators =>
  ({
    criteria: jest.fn().mockReturnValue({
      evaluate: jest.fn().mockResolvedValue({ score: gapScore }),
    }),
  } as unknown as DefaultEvaluators);

const makeArgs = (rule: RuleCreationResult['rule']) => ({
  input: {
    technique: 'T1059',
    gap_description: 'Any command execution activity',
    evidence: '',
    confidence: 0.1,
  },
  output: { rule, pendingApproval: false, traceId: undefined } as RuleCreationResult,
  expected: { mitreIds: ['T1059'], language: 'esql' as const },
  metadata: null,
});

const goodRule = {
  name: 'Specific Rule',
  description: 'desc',
  query: 'FROM logs-endpoint.events.process-* | WHERE event.type == "start"',
  language: 'esql',
  type: 'esql',
  severity: 'high',
  tags: ['t'],
  risk_score: 50,
  interval: '5m',
  from: 'now-10m',
  threat: [],
};

describe('createCanaryEvaluator', () => {
  it('trips hardest when the v3 quality gate explicitly declined the gap', async () => {
    const args = makeArgs(undefined);
    args.output = { ...args.output, skipped: true, skipReason: 'evidence is empty' };
    const result = await createCanaryEvaluator(makeEvaluators(1)).evaluate(args);
    expect(result.score).toBe(1);
    expect(result.metadata).toMatchObject({ trippedBy: 'quality gate (explicit skip)' });
  });

  it('scores N/A — not 1 — when there is neither a rule nor an explicit skip', async () => {
    // A crashed draft also produces no rule. Rewarding that with 1 is how a fully
    // broken run reported a passing canary (measured on build 454).
    const result = await createCanaryEvaluator(makeEvaluators(1)).evaluate(makeArgs(undefined));
    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });

  it('trips on a catch-all query without consulting the LLM judge', async () => {
    const evaluators = makeEvaluators(1);
    const result = await createCanaryEvaluator(evaluators).evaluate(
      makeArgs({ ...goodRule, query: 'FROM * | LIMIT 1000' })
    );
    expect(result.score).toBe(1);
    expect(result.metadata).toMatchObject({ trippedBy: 'Query Syntax Validity' });
    expect(evaluators.criteria).not.toHaveBeenCalled();
  });

  it('trips when the LLM judge scores the gap as unaddressed', async () => {
    const result = await createCanaryEvaluator(makeEvaluators(0)).evaluate(makeArgs(goodRule));
    expect(result.score).toBe(1);
    expect(result.metadata).toMatchObject({ trippedBy: 'Gap Addressed' });
  });

  it('scores 0 when nothing trips — the gate stopped discriminating', async () => {
    const result = await createCanaryEvaluator(makeEvaluators(1)).evaluate(makeArgs(goodRule));
    expect(result.score).toBe(0);
  });
});
