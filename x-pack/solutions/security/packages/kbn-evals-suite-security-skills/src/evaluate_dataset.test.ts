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
import type { SecuritySkillsDatasetExpected } from './evaluate_dataset';
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
  const wrappedExamples = securitySkillsExamples.map(toDatasetExample);

  const expectedNames = [
    'Factuality',
    'Relevance',
    'Sequence Accuracy',
    'ExpectedToolCalled',
    'ToolUsageOnly',
    'Trajectory',
    'Tool Calls',
    'Latency',
    'Input Tokens',
    'Output Tokens',
    'Cached Tokens',
    'Skill Invoked (find-security-rules)',
    'ExpectedSkillInvocation',
  ];

  it('pins the baseline L1–L5 evaluator stack', () => {
    const stack = buildSecuritySkillsEvaluators({
      ...buildBuildArgs(),
      examples: wrappedExamples,
    });
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
        tool_sequence: ['security.find_rules'],
      },
      metadata: {
        category: 'find-rules',
        query_intent: 'Rule Discovery',
        dataset_split: ['base'],
        expectedOnlyToolId: 'security.find_rules',
      },
    };
    const wrapped = toDatasetExample(ex);
    expect(wrapped.input?.question).toBe('List MITRE rules');
    expect(wrapped.output?.expectedSkill).toBe('find-security-rules');
    expect(wrapped.output?.tool_sequence).toEqual(['security.find_rules']);
    expect(wrapped.metadata?.expectedOnlyToolId).toBe('security.find_rules');
  });
});

describe('securitySkillsExamples', () => {
  it('includes find-rules happy-path and distractor splits only', () => {
    const distractors = securitySkillsExamples.filter((ex) => ex.metadata.is_distractor);
    const findRules = securitySkillsExamples.filter((ex) => ex.metadata.category === 'find-rules');
    expect(findRules.length).toBe(4);
    expect(distractors.length).toBe(2);
    expect(
      securitySkillsExamples.every(
        (ex) => ex.metadata.category === 'find-rules' || ex.metadata.category === 'distractor'
      )
    ).toBe(true);
  });
});

const VALID_TRACE_ID = '0af7651916cd43dd8448eb211c80319c';

const buildStackWithSkillInvoked = (skillInvoked: number) => {
  const query = jest.fn().mockResolvedValue({
    columns: [
      { name: 'total_spans', type: 'long' },
      { name: 'total_tool_spans', type: 'long' },
      { name: 'skill_invoked', type: 'long' },
    ],
    values: [[50, 4, skillInvoked]],
  });

  return {
    query,
    stack: buildSecuritySkillsEvaluators({
      ...buildBuildArgs(),
      traceEsClient: { esql: { query } } as unknown as EsClient,
      examples: securitySkillsExamples.map(toDatasetExample),
    }),
  };
};

const findEvaluator = <T extends Evaluator>(stack: T[], name: string): T => {
  const evaluator = stack.find((e) => e.name === name);
  if (!evaluator) {
    throw new Error(`Evaluator "${name}" missing from the stack`);
  }
  return evaluator;
};

describe('ToolUsageOnly evaluator', () => {
  const evaluateToolUsage = (
    metadata: Record<string, unknown>,
    toolIds: string[]
  ): ReturnType<Evaluator['evaluate']> => {
    const stack = buildSecuritySkillsEvaluators({
      ...buildBuildArgs(),
      examples: securitySkillsExamples.map(toDatasetExample),
    });

    return findEvaluator(stack, 'ToolUsageOnly').evaluate({
      input: { question: 'List MITRE rules' },
      output: { steps: toolIds.map((tool_id) => ({ type: 'tool_call', tool_id })) },
      expected: { reference: 'Uses find_rules', expected: 'Uses find_rules' },
      metadata: {
        category: 'find-rules',
        query_intent: 'Rule Discovery',
        dataset_split: ['base'],
        ...metadata,
      },
    });
  };

  it('accepts the discover_rule_tags call the find-rules skill mandates before find_rules', async () => {
    const result = await evaluateToolUsage({ expectedOnlyToolId: 'security.find_rules' }, [
      'security.discover_rule_tags',
      'security.find_rules',
    ]);

    expect(result.score).toBe(1);
  });

  it('fails when a domain tool outside the allow-list is used', async () => {
    const result = await evaluateToolUsage({ expectedOnlyToolId: 'security.find_rules' }, [
      'security.discover_rule_tags',
      'security.find_rules',
      'security.search_alerts',
    ]);

    expect(result.score).toBe(0);
  });

  it('keeps the single-tool allow-list for non find-rules examples', async () => {
    const result = await evaluateToolUsage(
      { expectedOnlyToolId: 'security.create_detection_rule' },
      ['security.discover_rule_tags', 'security.create_detection_rule']
    );

    expect(result.score).toBe(0);
  });
});

describe('Skill Invoked evaluator scoping', () => {
  const evaluateFindRulesSkillInvoked = (
    skillInvoked: number,
    expected: Partial<SecuritySkillsDatasetExpected>
  ): Promise<Awaited<ReturnType<Evaluator['evaluate']>>> => {
    const { stack } = buildStackWithSkillInvoked(skillInvoked);
    // The dataset parser treats expected_skill and should_not_activate_skill as
    // mutually exclusive (see security_skills_dataset.ts), so a real example
    // carries at most one of the two; build the metadata to match whichever
    // annotation the case under test exercises.
    const isDistractor = !expected.expectedSkill;

    return findEvaluator(stack, 'Skill Invoked (find-security-rules)').evaluate({
      input: { question: 'What is the weather in Berlin?' },
      output: { traceId: VALID_TRACE_ID },
      expected: { reference: 'ref', expected: 'ref', ...expected },
      metadata: isDistractor
        ? {
            category: 'distractor',
            query_intent: 'Out of domain',
            dataset_split: ['base'],
            is_distractor: true,
            shouldNotActivateSkill: 'find-security-rules',
          }
        : {
            category: 'find-rules',
            query_intent: 'Rule Discovery',
            dataset_split: ['base'],
          },
    });
  };

  it('passes a distractor when the skill was not invoked', async () => {
    const result = await evaluateFindRulesSkillInvoked(0, {
      shouldNotActivateSkill: 'find-security-rules',
    });

    expect(result.score).toBe(1);
  });

  it('fails a distractor when the skill was invoked', async () => {
    const result = await evaluateFindRulesSkillInvoked(1, {
      shouldNotActivateSkill: 'find-security-rules',
    });

    expect(result.score).toBe(0);
  });

  it('stays out of the way for examples that target another skill', async () => {
    const result = await evaluateFindRulesSkillInvoked(1, { expectedSkill: 'alert-analysis' });

    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });
});
