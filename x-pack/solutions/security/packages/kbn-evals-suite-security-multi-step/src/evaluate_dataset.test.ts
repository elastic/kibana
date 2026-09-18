/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { DefaultEvaluators, Evaluator } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import { buildMultiStepEvaluators, toDatasetExample } from './evaluate_dataset';
import type { MultiStepExample } from './dataset';

const stubTraceEvaluator = (name: string): Evaluator => ({
  name,
  kind: 'CODE',
  evaluate: jest.fn(),
});

const buildDefaultEvaluatorsStub = (): DefaultEvaluators =>
  ({
    criteria: jest.fn(),
    correctnessAnalysis: jest.fn(),
    groundednessAnalysis: jest.fn(),
    traceBasedEvaluators: {
      inputTokens: stubTraceEvaluator('Input Tokens'),
      outputTokens: stubTraceEvaluator('Output Tokens'),
      cachedTokens: stubTraceEvaluator('Cached Tokens'),
      toolCalls: stubTraceEvaluator('Tool Calls'),
      latency: stubTraceEvaluator('Latency'),
    },
  } as unknown as DefaultEvaluators);

const buildBuildArgs = () => ({
  evaluators: buildDefaultEvaluatorsStub(),
  traceEsClient: { esql: { query: jest.fn() } } as unknown as EsClient,
  log: {
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as ToolingLog,
});

describe('buildMultiStepEvaluators', () => {
  const expectedNames = [
    'Factuality',
    'Relevance',
    'Sequence Accuracy',
    'Tool Calls',
    'Latency',
    'Input Tokens',
    'Output Tokens',
    'Cached Tokens',
    'Skill Invoked',
    'ExpectedToolCalled',
    'Trajectory',
  ];

  it('pins the baseline L1–L5 evaluator stack', () => {
    const stack = buildMultiStepEvaluators(buildBuildArgs());
    expect(stack.map((e) => e.name)).toEqual(expectedNames);
  });
});

describe('toDatasetExample', () => {
  it('wraps multi-turn input and tool_sequence', () => {
    const ex: MultiStepExample = {
      input: { turns: ['hello', 'follow up'] },
      expected: {
        reference: 'ref',
        tool_sequence: ['security.alerts'],
        primary_skill: 'alert-analysis',
      },
      metadata: { scenario: 'full_chain_triage_investigate_rule', dataset_split: ['base'] },
    };
    const wrapped = toDatasetExample(ex);
    expect(wrapped.input?.turns).toHaveLength(2);
    expect(wrapped.output?.tool_sequence).toEqual(['security.alerts']);
  });

  it('flattens turns into a question so the correctness judge gets a real user_query', () => {
    const ex: MultiStepExample = {
      input: { turns: ['hello', 'follow up'] },
      expected: { reference: 'ref', tool_sequence: ['security.alerts'] },
      metadata: { scenario: 'full_chain_triage_investigate_rule', dataset_split: ['base'] },
    };
    const wrapped = toDatasetExample(ex);
    expect(wrapped.input?.question).toBe('Turn 1: hello\nTurn 2: follow up');
  });
});

const VALID_TRACE_ID = '0af7651916cd43dd8448eb211c80319c';

const evaluateSkillInvoked = ({
  output,
  query,
}: {
  output: Record<string, unknown>;
  query?: jest.Mock;
}): Promise<Awaited<ReturnType<Evaluator['evaluate']>>> => {
  const evaluators = buildMultiStepEvaluators({
    ...buildBuildArgs(),
    ...(query ? { traceEsClient: { esql: { query } } as unknown as EsClient } : {}),
  });

  const evaluator = evaluators.find((e) => e.name === 'Skill Invoked');
  if (!evaluator) {
    throw new Error('Skill Invoked evaluator missing from the stack');
  }

  return evaluator.evaluate({
    input: { turns: ['triage this alert'], question: 'Turn 1: triage this alert' },
    output,
    expected: { reference: 'ref', expected: 'ref', primary_skill: 'alert-analysis' },
    metadata: { scenario: 'distractor_general', dataset_split: ['base'], is_distractor: true },
  });
};

const buildSkillInvokedQuery = (skillInvoked: number) =>
  jest.fn().mockResolvedValue({
    columns: [
      { name: 'total_spans', type: 'long' },
      { name: 'total_tool_spans', type: 'long' },
      { name: 'skill_invoked', type: 'long' },
    ],
    values: [[50, 4, skillInvoked]],
  });

describe('Skill Invoked evaluator on distractor scenarios', () => {
  it('propagates an uninspectable trajectory instead of scoring it as a pass', async () => {
    // No trace id means the distractor was never checked. Inverting the null score
    // would report "skill correctly not invoked" for a run that proved nothing.
    const result = await evaluateSkillInvoked({ output: { steps: [] } });

    expect(result.score).toBeNull();
    expect(result.label).toBe('unavailable');
  });

  it('passes the distractor when the skill was not invoked', async () => {
    const result = await evaluateSkillInvoked({
      output: { traceIds: [VALID_TRACE_ID] },
      query: buildSkillInvokedQuery(0),
    });

    expect(result.score).toBe(1);
  });

  it('fails the distractor when the skill was invoked', async () => {
    const result = await evaluateSkillInvoked({
      output: { traceIds: [VALID_TRACE_ID] },
      query: buildSkillInvokedQuery(1),
    });

    expect(result.score).toBe(0);
  });
});
