/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { DefaultEvaluators, Evaluator } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import { buildSecuritySkillsEvaluators, toDatasetExample } from './evaluate_dataset';
import type { SecuritySkillsExample } from './dataset';
import { securitySkillsExamples } from './datasets';

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

describe('buildSecuritySkillsEvaluators', () => {
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
  ];

  it('pins the baseline L1–L5 evaluator stack', () => {
    const stack = buildSecuritySkillsEvaluators(buildBuildArgs());
    expect(stack.map((e) => e.name)).toEqual(expectedNames);
  });
});

describe('toDatasetExample', () => {
  it('wraps question input and expectedSkill metadata', () => {
    const ex: SecuritySkillsExample = {
      input: { question: 'List MITRE rules' },
      expected: {
        reference: 'Uses find_rules',
        expectedSkill: 'find-security-rules',
      },
      metadata: {
        category: 'find-rules',
        query_intent: 'Rule Discovery',
        dataset_split: ['base'],
      },
    };
    const wrapped = toDatasetExample(ex);
    expect(wrapped.input?.question).toBe('List MITRE rules');
    expect(wrapped.output?.expectedSkill).toBe('find-security-rules');
  });
});

describe('securitySkillsExamples', () => {
  it('includes happy-path and distractor splits', () => {
    const distractors = securitySkillsExamples.filter((ex) => ex.metadata.is_distractor);
    const happy = securitySkillsExamples.filter((ex) => !ex.metadata.is_distractor);
    expect(happy.length).toBeGreaterThanOrEqual(3);
    expect(distractors.length).toBeGreaterThanOrEqual(1);
  });
});
