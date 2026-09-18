/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEvaluateDataset } from './evaluate_dataset';

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
});
