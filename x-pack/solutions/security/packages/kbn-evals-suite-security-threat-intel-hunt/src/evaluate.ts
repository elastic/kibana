/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { HuntBehaviorClient } from './hunt_behavior_client';
import type { EvaluateThreatIntelHuntDataset } from './evaluate_dataset';
import { createEvaluateThreatIntelHuntDataset } from './evaluate_dataset';

export const evaluate = base.extend<
  {},
  {
    huntBehaviorClient: HuntBehaviorClient;
    evaluateDataset: EvaluateThreatIntelHuntDataset;
  }
>({
  huntBehaviorClient: [
    async ({ fetch, log }, use) => {
      await use(new HuntBehaviorClient(fetch, log));
    },
    { scope: 'worker' },
  ],
  evaluateDataset: [
    ({ huntBehaviorClient, evaluators, executorClient, log }, use) => {
      use(
        createEvaluateThreatIntelHuntDataset({
          huntBehaviorClient,
          evaluators,
          executorClient,
          log,
        })
      );
    },
    { scope: 'worker' },
  ],
});
