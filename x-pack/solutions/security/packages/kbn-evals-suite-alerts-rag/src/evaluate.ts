/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import type { EvaluateAlertsRagDataset } from './evaluate_dataset';
import { createEvaluateAlertsRagDataset } from './evaluate_dataset';

export const evaluate = base.extend<
  {},
  {
    evaluateDataset: EvaluateAlertsRagDataset;
  }
>({
  evaluateDataset: [
    ({ executorClient, inferenceClient, log }, use) => {
      use(
        createEvaluateAlertsRagDataset({
          executorClient,
          inferenceClient,
          log,
        })
      );
    },
    { scope: 'worker' },
  ],
});
