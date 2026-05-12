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

describe('createEvaluateEsqlGenerationDataset', () => {
  it('registers four evaluators with the expected names and kinds', async () => {
    const runExperiment = jest.fn().mockResolvedValue(undefined);
    const executorClient = { runExperiment } as unknown as EvalsExecutorClient;
    const inferenceClient = {} as unknown as BoundInferenceClient;
    const esClient = {} as unknown as EsClient;
    const log = {} as unknown as ToolingLog;

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
});
