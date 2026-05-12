/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { DefaultEvaluators, EvalsExecutorClient, Evaluator } from '@kbn/evals';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { createEvaluateEsqlGenerationDataset } from './evaluate_dataset';

function buildEvaluator(name: string): Evaluator {
  return {
    name,
    kind: 'CODE',
    evaluate: jest.fn().mockResolvedValue({ score: 0 }),
  };
}

function buildDeps() {
  const runExperiment = jest.fn().mockResolvedValue(undefined);
  const executorClient = { runExperiment } as unknown as EvalsExecutorClient;
  const inferenceClient = {} as unknown as BoundInferenceClient;
  const esClient = {} as unknown as EsClient;
  const traceEsClient = {} as unknown as EsClient;
  const log = {} as unknown as ToolingLog;
  const evaluators = {
    traceBasedEvaluators: {
      inputTokens: buildEvaluator('Input tokens'),
      outputTokens: buildEvaluator('Output tokens'),
      cachedTokens: buildEvaluator('Cached tokens'),
      toolCalls: buildEvaluator('Tool calls'),
      latency: buildEvaluator('Latency'),
    },
  } as unknown as DefaultEvaluators;
  return {
    runExperiment,
    evaluators,
    executorClient,
    inferenceClient,
    esClient,
    traceEsClient,
    log,
  };
}

describe('createEvaluateEsqlGenerationDataset', () => {
  const ORIGINAL_OFFSET = process.env.ESQL_GENERATION_DATASET_OFFSET;
  const ORIGINAL_LIMIT = process.env.ESQL_GENERATION_DATASET_LIMIT;

  afterEach(() => {
    process.env.ESQL_GENERATION_DATASET_OFFSET = ORIGINAL_OFFSET;
    process.env.ESQL_GENERATION_DATASET_LIMIT = ORIGINAL_LIMIT;
    if (ORIGINAL_OFFSET === undefined) delete process.env.ESQL_GENERATION_DATASET_OFFSET;
    if (ORIGINAL_LIMIT === undefined) delete process.env.ESQL_GENERATION_DATASET_LIMIT;
  });

  it('registers the quality and trace-based evaluator stack in the expected order', async () => {
    const {
      runExperiment,
      evaluators,
      executorClient,
      inferenceClient,
      esClient,
      traceEsClient,
      log,
    } = buildDeps();

    const evaluateDataset = createEvaluateEsqlGenerationDataset({
      evaluators,
      executorClient,
      inferenceClient,
      esClient,
      traceEsClient,
      log,
    });
    await evaluateDataset();

    expect(runExperiment).toHaveBeenCalledTimes(1);
    const [, evaluatorArray] = runExperiment.mock.calls[0];
    expect(evaluatorArray).toHaveLength(9);

    expect(evaluatorArray[0].name).toBe('ES|QL Functional Equivalence');
    expect(evaluatorArray[0].kind).toBe('LLM');

    expect(evaluatorArray[1].name).toBe('ES|QL Validity');
    expect(evaluatorArray[1].kind).toBe('CODE');

    expect(evaluatorArray[2].name).toBe('ES|QL Execution Validity');
    expect(evaluatorArray[2].kind).toBe('CODE');

    expect(evaluatorArray[3].name).toBe('ES|QL Result Equivalence');
    expect(evaluatorArray[3].kind).toBe('CODE');

    // Observability tier — trace-based evaluators sourced from the framework.
    expect(evaluatorArray[4].name).toBe('Tool calls');
    expect(evaluatorArray[5].name).toBe('Latency');
    expect(evaluatorArray[6].name).toBe('Input tokens');
    expect(evaluatorArray[7].name).toBe('Output tokens');
    expect(evaluatorArray[8].name).toBe('Cached tokens');
  });

  it('passes the full dataset to runExperiment when no env vars are set', async () => {
    delete process.env.ESQL_GENERATION_DATASET_OFFSET;
    delete process.env.ESQL_GENERATION_DATASET_LIMIT;
    const {
      runExperiment,
      evaluators,
      executorClient,
      inferenceClient,
      esClient,
      traceEsClient,
      log,
    } = buildDeps();

    await createEvaluateEsqlGenerationDataset({
      evaluators,
      executorClient,
      inferenceClient,
      esClient,
      traceEsClient,
      log,
    })();

    const [{ dataset }] = runExperiment.mock.calls[0];
    expect(dataset.examples).toHaveLength(31);
    expect(dataset.description).toContain('31 examples');
  });

  it('honors ESQL_GENERATION_DATASET_LIMIT to cap dataset size', async () => {
    process.env.ESQL_GENERATION_DATASET_LIMIT = '1';
    delete process.env.ESQL_GENERATION_DATASET_OFFSET;
    const {
      runExperiment,
      evaluators,
      executorClient,
      inferenceClient,
      esClient,
      traceEsClient,
      log,
    } = buildDeps();

    await createEvaluateEsqlGenerationDataset({
      evaluators,
      executorClient,
      inferenceClient,
      esClient,
      traceEsClient,
      log,
    })();

    const [{ dataset }] = runExperiment.mock.calls[0];
    expect(dataset.examples).toHaveLength(1);
    expect(dataset.description).toContain('1 examples');
  });

  it('honors ESQL_GENERATION_DATASET_OFFSET combined with LIMIT', async () => {
    process.env.ESQL_GENERATION_DATASET_OFFSET = '5';
    process.env.ESQL_GENERATION_DATASET_LIMIT = '2';
    const {
      runExperiment,
      evaluators,
      executorClient,
      inferenceClient,
      esClient,
      traceEsClient,
      log,
    } = buildDeps();

    await createEvaluateEsqlGenerationDataset({
      evaluators,
      executorClient,
      inferenceClient,
      esClient,
      traceEsClient,
      log,
    })();

    const [{ dataset }] = runExperiment.mock.calls[0];
    expect(dataset.examples).toHaveLength(2);
  });

  it('ignores non-numeric env values and falls back to the full dataset', async () => {
    process.env.ESQL_GENERATION_DATASET_LIMIT = 'not-a-number';
    process.env.ESQL_GENERATION_DATASET_OFFSET = '-3';
    const {
      runExperiment,
      evaluators,
      executorClient,
      inferenceClient,
      esClient,
      traceEsClient,
      log,
    } = buildDeps();

    await createEvaluateEsqlGenerationDataset({
      evaluators,
      executorClient,
      inferenceClient,
      esClient,
      traceEsClient,
      log,
    })();

    const [{ dataset }] = runExperiment.mock.calls[0];
    expect(dataset.examples).toHaveLength(31);
  });
});
