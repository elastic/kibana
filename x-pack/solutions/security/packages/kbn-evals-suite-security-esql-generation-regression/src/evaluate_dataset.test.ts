/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { EvalsExecutorClient } from '@kbn/evals';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { createEvaluateEsqlGenerationDataset } from './evaluate_dataset';

function buildDeps() {
  const runExperiment = jest.fn().mockResolvedValue(undefined);
  const executorClient = { runExperiment } as unknown as EvalsExecutorClient;
  const inferenceClient = {} as unknown as BoundInferenceClient;
  const esClient = {} as unknown as EsClient;
  const log = {} as unknown as ToolingLog;
  return { runExperiment, executorClient, inferenceClient, esClient, log };
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

  it('registers four evaluators with the expected names and kinds', async () => {
    const { runExperiment, executorClient, inferenceClient, esClient, log } = buildDeps();

    const evaluateDataset = createEvaluateEsqlGenerationDataset({
      executorClient,
      inferenceClient,
      esClient,
      log,
    });
    await evaluateDataset();

    expect(runExperiment).toHaveBeenCalledTimes(1);
    const [, evaluators] = runExperiment.mock.calls[0];
    expect(evaluators).toHaveLength(4);

    expect(evaluators[0].name).toBe('ES|QL Functional Equivalence');
    expect(evaluators[0].kind).toBe('LLM');

    expect(evaluators[1].name).toBe('ES|QL Validity');
    expect(evaluators[1].kind).toBe('CODE');

    expect(evaluators[2].name).toBe('ES|QL Execution Validity');
    expect(evaluators[2].kind).toBe('CODE');

    expect(evaluators[3].name).toBe('ES|QL Result Equivalence');
    expect(evaluators[3].kind).toBe('CODE');
  });

  it('passes the full dataset to runExperiment when no env vars are set', async () => {
    delete process.env.ESQL_GENERATION_DATASET_OFFSET;
    delete process.env.ESQL_GENERATION_DATASET_LIMIT;
    const { runExperiment, executorClient, inferenceClient, esClient, log } = buildDeps();

    await createEvaluateEsqlGenerationDataset({
      executorClient,
      inferenceClient,
      esClient,
      log,
    })();

    const [{ dataset }] = runExperiment.mock.calls[0];
    expect(dataset.examples).toHaveLength(31);
    expect(dataset.description).toContain('31 examples');
  });

  it('honors ESQL_GENERATION_DATASET_LIMIT to cap dataset size', async () => {
    process.env.ESQL_GENERATION_DATASET_LIMIT = '1';
    delete process.env.ESQL_GENERATION_DATASET_OFFSET;
    const { runExperiment, executorClient, inferenceClient, esClient, log } = buildDeps();

    await createEvaluateEsqlGenerationDataset({
      executorClient,
      inferenceClient,
      esClient,
      log,
    })();

    const [{ dataset }] = runExperiment.mock.calls[0];
    expect(dataset.examples).toHaveLength(1);
    expect(dataset.description).toContain('1 examples');
  });

  it('honors ESQL_GENERATION_DATASET_OFFSET combined with LIMIT', async () => {
    process.env.ESQL_GENERATION_DATASET_OFFSET = '5';
    process.env.ESQL_GENERATION_DATASET_LIMIT = '2';
    const { runExperiment, executorClient, inferenceClient, esClient, log } = buildDeps();

    await createEvaluateEsqlGenerationDataset({
      executorClient,
      inferenceClient,
      esClient,
      log,
    })();

    const [{ dataset }] = runExperiment.mock.calls[0];
    expect(dataset.examples).toHaveLength(2);
  });

  it('ignores non-numeric env values and falls back to the full dataset', async () => {
    process.env.ESQL_GENERATION_DATASET_LIMIT = 'not-a-number';
    process.env.ESQL_GENERATION_DATASET_OFFSET = '-3';
    const { runExperiment, executorClient, inferenceClient, esClient, log } = buildDeps();

    await createEvaluateEsqlGenerationDataset({
      executorClient,
      inferenceClient,
      esClient,
      log,
    })();

    const [{ dataset }] = runExperiment.mock.calls[0];
    expect(dataset.examples).toHaveLength(31);
  });
});
