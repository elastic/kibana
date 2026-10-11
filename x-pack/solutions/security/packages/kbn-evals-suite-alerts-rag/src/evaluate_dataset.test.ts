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
  buildAlertsRagEvaluators,
  createAlertsRagTrajectoryEvaluator,
  toDatasetExample,
  type AlertsRagDatasetExample,
} from './evaluate_dataset';
import type { AlertsRagExample } from './dataset';

const stubTraceEvaluator = (name: string): Evaluator => ({
  name,
  kind: 'CODE',
  direction: 'maximize',
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

describe('buildAlertsRagEvaluators', () => {
  // The evaluator set is load-bearing for the regression story: each name
  // here is a column in the Buildkite eval report. A silent drop or rename
  // would skip regression coverage without changing the suite's exit code,
  // so this test pins the expected names against the framework primitives.
  const expectedNames = [
    // Quantitative correctness — deterministic scores from the precomputed
    // CorrectnessAnalysis attached by the task function. Provided by
    // `createQuantitativeCorrectnessEvaluators` from @kbn/evals.
    'Factuality',
    'Relevance',
    'Sequence Accuracy',
    // Quantitative groundedness — deterministic score from the precomputed
    // GroundednessAnalysis. Provided by `createQuantitativeGroundednessEvaluator`.
    'Groundedness',
    // Observability signals — trace-based, zero per-example LLM cost. Read
    // OTel spans for the conversation's `trace.id` from `traces-*` and
    // emit numeric scores that establish a baseline we can track over time.
    'Tool Calls',
    'Latency',
    'Input Tokens',
    'Output Tokens',
    'Cached Tokens',
    // Skill activation — verifies the agent invoked the canonical
    // `alert-analysis` skill rather than freelancing with raw tools.
    // Detected via `filestore.read` of `alert-analysis/SKILL.md` in the trace.
    'Skill Invoked (alert-analysis)',
    // Tool-call sequence alignment — LCS for order + set intersection for
    // coverage, scored against `tool_sequence` annotations on the dataset.
    // Code-judged (no LLM cost). Reports N/A for unannotated examples so
    // partial coverage doesn't pull averages down.
    'Trajectory',
    // Distinct tools per example that Agent Builder's classification cannot place;
    // each one makes Trajectory N/A for that example.
    'unclassified-tools',
  ];

  it('returns the canonical evaluator set in a stable order', () => {
    const evaluators = buildAlertsRagEvaluators(buildBuildArgs());
    const names = evaluators.map((e) => e.name);
    expect(names).toEqual(expectedNames);
  });

  it('returns only framework-native evaluators (no custom Faithfulness/AnswerCorrectness)', () => {
    const evaluators = buildAlertsRagEvaluators(buildBuildArgs());
    const names = evaluators.map((e) => e.name);
    expect(names).not.toContain('Faithfulness');
    expect(names).not.toContain('AnswerCorrectness');
  });
});

describe('toDatasetExample', () => {
  const fixture: AlertsRagExample = {
    input: 'what hosts are affected?',
    expected: { reference: 'SRVMAC08, SRVMAC09' },
    metadata: { category: 'field_specific_lookup', dataset_split: ['regression'] },
  };

  it('mirrors reference into output.expected so framework correctnessAnalysis reads it', () => {
    // The framework's `createCorrectnessAnalysisEvaluator` reads
    // `expected?.expected`. Without mirroring `reference -> expected`, the
    // judge receives `undefined` for the ground-truth answer and silently
    // scores the response as unevaluable. This assertion locks that contract.
    const wrapped = toDatasetExample(fixture);
    expect(wrapped.output).toEqual({
      reference: 'SRVMAC08, SRVMAC09',
      expected: 'SRVMAC08, SRVMAC09',
    });
  });

  it('wraps the question into the framework Input shape', () => {
    const wrapped = toDatasetExample(fixture);
    expect(wrapped.input).toEqual({ question: 'what hosts are affected?' });
  });

  it('forwards metadata for the framework-side report grouping', () => {
    const wrapped = toDatasetExample(fixture);
    expect(wrapped.metadata).toEqual({
      category: 'field_specific_lookup',
      dataset_split: ['regression'],
    });
  });

  it('forwards spaceId into metadata when the example is space-scoped', () => {
    const spaceScoped: AlertsRagExample = {
      ...fixture,
      metadata: {
        ...fixture.metadata,
        category: 'space_isolation',
        spaceId: 'alerts-rag-empty',
      },
    };
    const wrapped = toDatasetExample(spaceScoped);
    expect(wrapped.metadata).toEqual({
      category: 'space_isolation',
      dataset_split: ['regression'],
      spaceId: 'alerts-rag-empty',
    });
  });

  it('forwards tool_sequence into output when annotated', () => {
    const annotated: AlertsRagExample = {
      ...fixture,
      expected: { ...fixture.expected, tool_sequence: ['security.alerts'] },
    };
    const wrapped = toDatasetExample(annotated);
    expect(wrapped.output).toEqual({
      reference: 'SRVMAC08, SRVMAC09',
      expected: 'SRVMAC08, SRVMAC09',
      tool_sequence: ['security.alerts'],
    });
  });

  it('omits tool_sequence from output when the example is unannotated', () => {
    const wrapped = toDatasetExample(fixture);
    expect(wrapped.output).not.toHaveProperty('tool_sequence');
  });
});

describe('createAlertsRagTrajectoryEvaluator', () => {
  const buildArgs = (
    expected: AlertsRagDatasetExample['output'],
    steps: Array<{ type?: string; tool_id?: string; tool_origin?: string }>
  ) =>
    ({
      input: { question: 'q' },
      expected,
      output: { steps } as unknown,
      metadata: { category: 'field_specific_lookup', dataset_split: ['regression'] },
    } as unknown as Parameters<
      ReturnType<typeof createAlertsRagTrajectoryEvaluator>['evaluate']
    >[0]);

  it('returns N/A when the example has no tool_sequence annotation', async () => {
    const evaluator = createAlertsRagTrajectoryEvaluator();
    const result = await evaluator.evaluate(
      buildArgs({ reference: 'r', expected: 'r' }, [
        { type: 'tool_call', tool_id: 'security.alerts' },
      ])
    );
    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
    expect(result.explanation).toMatch(/No tool_sequence annotation/i);
  });

  it('scores a perfect match when the agent calls exactly the golden tool', async () => {
    const evaluator = createAlertsRagTrajectoryEvaluator();
    const result = await evaluator.evaluate(
      buildArgs({ reference: 'r', expected: 'r', tool_sequence: ['security.alerts'] }, [
        { type: 'tool_call', tool_id: 'security.alerts' },
      ])
    );
    expect(result.score).toBe(1);
    expect(result.label).toBe('good');
  });

  it('drops Agent Builder runtime tools from the actual sequence', async () => {
    const evaluator = createAlertsRagTrajectoryEvaluator();
    const result = await evaluator.evaluate(
      buildArgs({ reference: 'r', expected: 'r', tool_sequence: ['security.alerts'] }, [
        { type: 'tool_call', tool_id: 'load_skill', tool_origin: 'internal' },
        { type: 'tool_call', tool_id: 'filestore.read' },
        { type: 'tool_call', tool_id: 'security.alerts', tool_origin: 'registry' },
        { type: 'tool_call', tool_id: 'attachments.read', tool_origin: 'internal' },
      ])
    );
    expect(result.score).toBe(1);
    const metadata = result.metadata as {
      actual: string[];
      extraTools: string[];
      runtimeToolIds: string[];
    };
    // Legacy filestore reads reach data, so they stay in the scored sequence.
    expect(metadata.actual).toEqual(['filestore.read', 'security.alerts']);
    expect(metadata.runtimeToolIds).toEqual(['load_skill', 'attachments.read']);
  });

  it('returns N/A naming a tool Agent Builder does not classify', async () => {
    const evaluator = createAlertsRagTrajectoryEvaluator();
    const result = await evaluator.evaluate(
      buildArgs({ reference: 'r', expected: 'r', tool_sequence: ['security.alerts'] }, [
        { type: 'tool_call', tool_id: 'security.alerts', tool_origin: 'registry' },
        { type: 'tool_call', tool_id: 'new_ab_tool', tool_origin: 'internal' },
      ])
    );
    expect(result).toMatchObject({
      score: null,
      label: 'N/A',
      explanation: 'unclassified-tool:new_ab_tool',
    });
  });

  it('flags the wrong tool with extra tools and a low score', async () => {
    const evaluator = createAlertsRagTrajectoryEvaluator();
    const result = await evaluator.evaluate(
      buildArgs({ reference: 'r', expected: 'r', tool_sequence: ['security.alerts'] }, [
        { type: 'tool_call', tool_id: 'platform.alerting.search' },
      ])
    );
    expect(result.score).toBe(0);
    expect(result.label).toBe('poor');
    const metadata = result.metadata as { missingTools: string[]; extraTools: string[] };
    expect(metadata.missingTools).toEqual(['security.alerts']);
    expect(metadata.extraTools).toEqual(['platform.alerting.search']);
  });
});
