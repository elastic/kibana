/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { DefaultEvaluators, Evaluator } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import { ruleRoutingExamples } from '../datasets/routing_examples';
import {
  buildRuleRoutingEvaluators,
  toRoutingDatasetExample,
} from './evaluate_routing_dataset';

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

describe('buildRuleRoutingEvaluators', () => {
  const wrappedExamples = ruleRoutingExamples.map(toRoutingDatasetExample);

  it('pins the Track B L1/L2/L4 routing evaluator stack', () => {
    const stack = buildRuleRoutingEvaluators({
      ...buildBuildArgs(),
      examples: wrappedExamples,
    });
    expect(stack.map((e) => e.name)).toEqual([
      'ExpectedToolCalled',
      'ToolUsageOnly',
      'ForbiddenToolNotCalled',
      'Trajectory',
      'Tool Calls',
      'Latency',
      'Input Tokens',
      'Output Tokens',
      'Cached Tokens',
      'Skill Invoked (find-security-rules)',
      'ExpectedSkillInvocation',
    ]);
  });
});

describe('toRoutingDatasetExample', () => {
  it('wraps routing metadata for rule creation collision guards', () => {
    const wrapped = toRoutingDatasetExample(ruleRoutingExamples[0]!);
    expect(wrapped.output?.shouldNotActivateSkill).toBe('find-security-rules');
    expect(wrapped.metadata?.expectedToolId).toBe('security.create_detection_rule');
  });

  it('wraps find-rules examples with forbidden create tool', () => {
    const findExample = ruleRoutingExamples.find((ex) => ex.metadata.category === 'find-rules');
    expect(findExample).toBeDefined();
    const wrapped = toRoutingDatasetExample(findExample!);
    expect(wrapped.output?.expectedSkill).toBe('find-security-rules');
    expect(wrapped.metadata?.forbiddenToolId).toBe('security.create_detection_rule');
  });
});

describe('ruleRoutingExamples', () => {
  it('includes rule creation, find-rules, and distractor splits', () => {
    const creation = ruleRoutingExamples.filter((ex) => ex.metadata.category === 'rule-creation');
    const findRules = ruleRoutingExamples.filter((ex) => ex.metadata.category === 'find-rules');
    const distractors = ruleRoutingExamples.filter((ex) => ex.metadata.is_distractor);
    expect(creation.length).toBeGreaterThanOrEqual(2);
    expect(findRules.length).toBeGreaterThanOrEqual(2);
    expect(distractors.length).toBeGreaterThanOrEqual(1);
  });
});
