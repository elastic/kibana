/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalsExecutorClient } from '@kbn/evals';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { createEvaluateEsqlGenerationDataset } from './evaluate_dataset';

describe('createEvaluateEsqlGenerationDataset', () => {
  it('registers an LLM evaluator named "ES|QL Functional Equivalence"', async () => {
    const runExperiment = jest.fn().mockResolvedValue(undefined);
    const executorClient = { runExperiment } as unknown as EvalsExecutorClient;
    const inferenceClient = {} as unknown as BoundInferenceClient;
    const log = {} as unknown as ToolingLog;

    const evaluateDataset = createEvaluateEsqlGenerationDataset({
      executorClient,
      inferenceClient,
      log,
    });
    await evaluateDataset();

    expect(runExperiment).toHaveBeenCalledTimes(1);
    const [, evaluators] = runExperiment.mock.calls[0];
    expect(evaluators).toHaveLength(1);
    expect(evaluators[0].name).toBe('ES|QL Functional Equivalence');
    expect(evaluators[0].kind).toBe('LLM');
  });
});
