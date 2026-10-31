/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  clearDatasetSkipSummaries,
  createEvaluateDataset,
  getDatasetSkipSummaries,
} from './evaluate_dataset';

type FactoryDeps = Parameters<typeof createEvaluateDataset>[0];
type DatasetArg = Parameters<ReturnType<typeof createEvaluateDataset>>[0]['dataset'];
type TraceBasedEvaluatorMap = FactoryDeps['evaluators']['traceBasedEvaluators'];
type TraceBasedEvaluator = TraceBasedEvaluatorMap[keyof TraceBasedEvaluatorMap];

const SKILL_INVOCATION_EVALUATOR = 'Skill Invoked (detection-rule-edit)';

const createEvaluator = (name: string): TraceBasedEvaluator =>
  ({ name, evaluate: jest.fn() } as unknown as TraceBasedEvaluator);

const createHarness = () => {
  const traceBasedEvaluators = {
    latency: createEvaluator('Latency'),
    tokens: createEvaluator('Token Usage'),
  };

  const executorClient = { runExperiment: jest.fn() } as unknown as FactoryDeps['executorClient'];

  const deps: FactoryDeps = {
    evaluators: { traceBasedEvaluators } as unknown as FactoryDeps['evaluators'],
    executorClient,
    chatClient: { generateRule: jest.fn() } as unknown as FactoryDeps['chatClient'],
    inferenceClient: {} as unknown as FactoryDeps['inferenceClient'],
    traceEsClient: {} as unknown as FactoryDeps['traceEsClient'],
    log: {
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      success: jest.fn(),
    } as unknown as FactoryDeps['log'],
  };

  return {
    deps,
    runExperiment: (executorClient as unknown as { runExperiment: jest.Mock }).runExperiment,
  };
};

const dataset = { name: 'sample_rules', examples: [] } as unknown as DatasetArg;

// `runExperiment(experiment, evaluators)` — the registered evaluators are the second argument, and
// they are what the report and the metrics are built from.
const registeredEvaluatorNames = (runExperiment: jest.Mock): string[] =>
  (runExperiment.mock.calls[0][1] as Array<{ name: string }>).map((evaluator) => evaluator.name);

describe('createEvaluateDataset', () => {
  afterEach(() => {
    delete process.env.SELECTED_EVALUATORS;
    clearDatasetSkipSummaries();
  });

  it('registers the trace-based and skill-invocation evaluators', async () => {
    const { deps, runExperiment } = createHarness();

    await createEvaluateDataset(deps)({ dataset });

    // Dropping the trace-based spread or the skill-invocation evaluator would silently remove
    // those metrics from every run, which is the failure mode this suite is meant to catch.
    expect(registeredEvaluatorNames(runExperiment)).toEqual(
      expect.arrayContaining(['Latency', 'Token Usage', SKILL_INVOCATION_EVALUATOR])
    );
  });

  it('honours SELECTED_EVALUATORS when registering evaluators', async () => {
    process.env.SELECTED_EVALUATORS = SKILL_INVOCATION_EVALUATOR;
    const { deps, runExperiment } = createHarness();

    await createEvaluateDataset(deps)({ dataset });

    expect(registeredEvaluatorNames(runExperiment)).toEqual([SKILL_INVOCATION_EVALUATOR]);
  });

  it('keeps infrastructure failure counters at zero when a negative case generates a rule', async () => {
    const { deps, runExperiment } = createHarness();
    const prompt = 'detect tomorrow before it happens';
    const generatedRule = {
      name: 'Impossible detection',
      description: 'A rule that should not have been generated',
      query: 'FROM logs-* | WHERE event.category == "process"',
      type: 'esql',
      language: 'esql',
      severity: 'medium',
      riskScore: 50,
      interval: '5m',
      from: 'now-6m',
      tags: [],
      threat: [],
    };
    const taskResult = {
      generatedRule,
      traceId: 'negative-rule-trace',
      toolCalls: ['security.create_detection_rule'],
    };
    const negativeDataset: DatasetArg = {
      name: 'negative_generated_rule',
      description: 'Negative-case rule generation summary regression',
      examples: [],
    };
    (deps.chatClient.generateRule as jest.Mock).mockResolvedValue(taskResult);
    runExperiment.mockImplementation(async ({ task }, evaluators) => {
      const input = { prompt };
      const expected = { category: 'negative' };
      const output = await task({ input, output: expected });
      expect(output).toEqual(taskResult);
      const rejection = evaluators.find(
        (evaluator: { name: string }) => evaluator.name === 'Rejection'
      );
      expect(await rejection.evaluate({ input, output, expected, metadata: null })).toMatchObject({
        score: 0,
      });
    });

    await createEvaluateDataset(deps)({ dataset: negativeDataset });

    expect(deps.chatClient.generateRule).toHaveBeenCalledWith(prompt);
    expect(getDatasetSkipSummaries()).toEqual([
      {
        datasetName: negativeDataset.name,
        totalExamples: 1,
        succeeded: 0,
        missingIndexSkips: 0,
        otherFailures: 0,
        otherFailureReasons: [],
      },
    ]);
  });

  describe('Tool Trajectory on the task path', () => {
    const POSITIVE_EXPECTED = { name: 'process_spawn', category: 'execution' };
    const NEGATIVE_EXPECTED = { name: 'impossible_request', category: 'negative' };

    interface Experiment {
      task: (example: { input: { prompt: string }; output: unknown }) => Promise<unknown>;
    }
    interface RegisteredEvaluator {
      name: string;
      evaluate: (args: Record<string, unknown>) => Promise<{
        score?: number | null;
        label?: string;
        explanation?: string;
      }>;
    }

    // Runs one example through the real task closure and the registered evaluators, exactly as
    // the executor does: the task's return value is the `output` every evaluator receives.
    const runExample = async (
      generateRule: () => Promise<unknown>,
      expected: Record<string, unknown>
    ) => {
      const { deps, runExperiment } = createHarness();
      (deps.chatClient.generateRule as jest.Mock).mockImplementation(generateRule);

      await createEvaluateDataset(deps)({ dataset });

      const [experiment, evaluators] = runExperiment.mock.calls[0] as [
        Experiment,
        RegisteredEvaluator[]
      ];
      const input = { prompt: 'detect suspicious process spawns' };
      const output = await experiment.task({ input, output: expected });
      const scoreWith = (name: string) => {
        const evaluator = evaluators.find((candidate) => candidate.name === name);
        if (!evaluator) throw new Error(`evaluator ${name} is not registered`);
        return evaluator.evaluate({ input, output, expected, metadata: null });
      };
      return { output, scoreWith };
    };

    it('scores a completed round that never called the rule tool instead of skipping it', async () => {
      const { scoreWith } = await runExample(
        async () => ({ error: 'No rule returned from agent', traceId: 'trace-1', toolCalls: [] }),
        POSITIVE_EXPECTED
      );

      const result = await scoreWith('Tool Trajectory');
      expect(result.score).toBe(0);
      expect(result.label).not.toBe('N/A');
    });

    it('scores a completed round that called only the wrong tools', async () => {
      const { scoreWith } = await runExample(
        async () => ({
          error: 'No rule returned from agent',
          traceId: 'trace-2',
          toolCalls: ['platform.core.search', 'platform.core.execute_esql'],
        }),
        POSITIVE_EXPECTED
      );

      const result = await scoreWith('Tool Trajectory');
      expect(result.score).toBe(0);
      expect(result.label).not.toBe('N/A');
    });

    it('keeps rule-quality evaluators N/A for the same completed no-rule round', async () => {
      const { scoreWith } = await runExample(
        async () => ({ error: 'No rule returned from agent', traceId: 'trace-3', toolCalls: [] }),
        POSITIVE_EXPECTED
      );

      expect((await scoreWith('Field Coverage')).score).toBeNull();
    });

    it('returns N/A when the converse request never returned a response', async () => {
      const { output, scoreWith } = await runExample(async () => {
        throw new Error('socket hang up');
      }, POSITIVE_EXPECTED);

      expect(output).toEqual({ error: 'socket hang up' });
      const result = await scoreWith('Tool Trajectory');
      expect(result.score).toBeNull();
      expect(result.label).toBe('N/A');
    });

    it('returns N/A for missing-index failures even when tool calls were observed', async () => {
      const { scoreWith } = await runExample(
        async () => ({
          error: 'Could not discover a suitable index for this rule',
          traceId: 'trace-4',
          toolCalls: ['security.create_detection_rule'],
        }),
        POSITIVE_EXPECTED
      );

      const result = await scoreWith('Tool Trajectory');
      expect(result.score).toBeNull();
      expect(result.explanation).toMatch(/missing index/);
    });

    it('scores the exact expected sequence as a perfect trajectory', async () => {
      const { scoreWith } = await runExample(
        async () => ({
          generatedRule: { name: 'Suspicious process spawn', query: 'FROM logs-* | LIMIT 1' },
          traceId: 'trace-5',
          toolCalls: ['security.create_detection_rule'],
        }),
        POSITIVE_EXPECTED
      );

      expect((await scoreWith('Tool Trajectory')).score).toBe(1);
    });

    it('scores a refused negative case with no tool calls as a perfect trajectory', async () => {
      const { scoreWith } = await runExample(
        async () => ({ error: 'No rule returned from agent', traceId: 'trace-6', toolCalls: [] }),
        NEGATIVE_EXPECTED
      );

      expect((await scoreWith('Tool Trajectory')).score).toBe(1);
    });
  });
});
