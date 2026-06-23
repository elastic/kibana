/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { DefaultEvaluators, Evaluator } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  buildMultiStepEvaluators,
  toDatasetExample,
} from './evaluate_dataset';
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
    'Skill Invoked (alert-analysis)',
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
    expect(wrapped.input.turns).toHaveLength(2);
    expect(wrapped.output.tool_sequence).toEqual(['security.alerts']);
  });
});
