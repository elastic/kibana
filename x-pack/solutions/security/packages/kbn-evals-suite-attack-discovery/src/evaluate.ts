/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { AttackDiscoveryClient } from './clients/attack_discovery_client';
import type { EvaluateAttackDiscoveryDataset } from './evaluate_dataset';
import { createEvaluateAttackDiscoveryDataset } from './evaluate_dataset';

export const evaluate = base.extend<
  {},
  {
    attackDiscoveryClient: AttackDiscoveryClient;
    evaluateDataset: EvaluateAttackDiscoveryDataset;
  }
>({
  attackDiscoveryClient: [
    async ({ esClient, log }, use) => {
      await use(new AttackDiscoveryClient(esClient, log));
    },
    { scope: 'worker' },
  ],
  evaluateDataset: [
    ({ attackDiscoveryClient, executorClient, inferenceClient, evaluationConnector, log }, use) => {
      use(
        createEvaluateAttackDiscoveryDataset({
          attackDiscoveryClient,
          executorClient,
          inferenceClient,
          evaluationConnectorId: evaluationConnector.id,
          log,
        })
      );
    },
    { scope: 'worker' },
  ],
});
