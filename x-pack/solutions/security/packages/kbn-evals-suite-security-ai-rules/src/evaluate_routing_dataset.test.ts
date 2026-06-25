/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { DefaultEvaluators, Evaluator, TaskOutput } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import { ruleRoutingExamples } from '../datasets/routing_examples';
import { buildRuleRoutingEvaluators, toRoutingDatasetExample } from './evaluate_routing_dataset';

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

  it('uses discover-then-find trajectory goldens for find-rules routing', () => {
    for (const example of ruleRoutingExamples.filter((ex) => ex.metadata.category === 'find-rules')) {
      expect(example.metadata.tool_sequence).toEqual([
        'security.discover_rule_tags',
        'security.find_rules',
      ]);
    }
  });

  it('does not annotate rule-creation examples with tool trajectory goldens', () => {
    for (const example of ruleRoutingExamples.filter(
      (ex) => ex.metadata.category === 'rule-creation'
    )) {
      expect(example.metadata.tool_sequence).toBeUndefined();
      expect(example.expected.tool_sequence).toBeUndefined();
    }
  });
});

describe('routing evaluator behavior', () => {
  const wrappedExamples = ruleRoutingExamples.map(toRoutingDatasetExample);

  const buildStack = () =>
    buildRuleRoutingEvaluators({
      ...buildBuildArgs(),
      examples: wrappedExamples,
    });

  const findEvaluator = <T extends Evaluator>(stack: T[], name: string) => {
    const evaluator = stack.find((e) => e.name === name);
    expect(evaluator).toBeDefined();
    return evaluator!;
  };

  it('scores discover + find_rules as ToolUsageOnly pass for find-rules routing', async () => {
    const stack = buildStack();
    const toolUsageOnly = findEvaluator(stack, 'ToolUsageOnly');
    const findExample = wrappedExamples.find((ex) => ex.metadata?.category === 'find-rules')!;

    const output: TaskOutput = {
      steps: [
        { type: 'tool_call', tool_id: 'security.discover_rule_tags', params: {} },
        { type: 'tool_call', tool_id: 'security.find_rules', params: {} },
      ],
    };

    const result = await toolUsageOnly.evaluate({
      output,
      expected: findExample.output,
      metadata: findExample.metadata,
      input: findExample.input,
    });

    expect(result.score).toBe(1);
  });

  it('returns N/A trajectory for rule-creation routing examples', async () => {
    const stack = buildStack();
    const trajectory = findEvaluator(stack, 'Trajectory');
    const creationExample = wrappedExamples.find(
      (ex) => ex.metadata?.category === 'rule-creation'
    )!;

    const result = await trajectory.evaluate({
      output: {
        steps: [{ type: 'tool_call', tool_id: 'security.create_detection_rule', params: {} }],
      },
      expected: creationExample.output,
      metadata: creationExample.metadata,
      input: creationExample.input,
    });

    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });

  it('returns N/A ExpectedToolCalled for find-rules routing examples', async () => {
    const stack = buildStack();
    const expectedToolCalled = findEvaluator(stack, 'ExpectedToolCalled');
    const findExample = wrappedExamples.find((ex) => ex.metadata?.category === 'find-rules')!;

    const result = await expectedToolCalled.evaluate({
      output: {
        steps: [{ type: 'tool_call', tool_id: 'platform.core.search', params: {} }],
      },
      expected: findExample.output,
      metadata: findExample.metadata,
      input: findExample.input,
    });

    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });

  it('scores ExpectedToolCalled for rule-creation when create tool is invoked', async () => {
    const stack = buildStack();
    const expectedToolCalled = findEvaluator(stack, 'ExpectedToolCalled');
    const creationExample = wrappedExamples.find(
      (ex) => ex.metadata?.category === 'rule-creation'
    )!;

    const result = await expectedToolCalled.evaluate({
      output: {
        steps: [{ type: 'tool_call', tool_id: 'security.create_detection_rule', params: {} }],
      },
      expected: creationExample.output,
      metadata: creationExample.metadata,
      input: creationExample.input,
    });

    expect(result.score).toBe(1);
  });

  it('scores ExpectedToolCalled 0 for rule-creation when create tool is missing', async () => {
    const stack = buildStack();
    const expectedToolCalled = findEvaluator(stack, 'ExpectedToolCalled');
    const creationExample = wrappedExamples.find(
      (ex) => ex.metadata?.category === 'rule-creation'
    )!;

    const result = await expectedToolCalled.evaluate({
      output: {
        steps: [{ type: 'tool_call', tool_id: 'platform.core.search', params: {} }],
      },
      expected: creationExample.output,
      metadata: creationExample.metadata,
      input: creationExample.input,
    });

    expect(result.score).toBe(0);
  });
});
