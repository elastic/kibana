/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { LeadGenerationClient } from './clients/lead_generation_client';
import type { EvaluateLeadGenerationDataset } from './evaluate_dataset';
import { createEvaluateLeadGenerationDataset } from './evaluate_dataset';

export const evaluate = base.extend<
  {},
  {
    leadGenerationClient: LeadGenerationClient;
    evaluateDataset: EvaluateLeadGenerationDataset;
  }
>({
  leadGenerationClient: [
    async ({ kbnClient, log }, use) => {
      await use(new LeadGenerationClient(kbnClient, log));
    },
    { scope: 'worker' },
  ],

  evaluateDataset: [
    (
      {
        leadGenerationClient,
        executorClient,
        inferenceClient,
        evaluationConnector,
        connector,
        log,
      },
      use
    ) => {
      use(
        createEvaluateLeadGenerationDataset({
          leadGenerationClient,
          executorClient,
          inferenceClient,
          connectorId: connector.id,
          evaluationConnectorId: evaluationConnector.id,
          log,
        })
      );
    },
    { scope: 'worker' },
  ],
});
