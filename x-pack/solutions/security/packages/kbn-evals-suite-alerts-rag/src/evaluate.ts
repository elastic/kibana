/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { AlertsRagAgentBuilderChatClient } from './chat_client';
import type { EvaluateAlertsRagDataset } from './evaluate_dataset';
import { createEvaluateAlertsRagDataset } from './evaluate_dataset';

export const evaluate = base.extend<
  {},
  {
    chatClient: AlertsRagAgentBuilderChatClient;
    evaluateDataset: EvaluateAlertsRagDataset;
  }
>({
  chatClient: [
    async ({ fetch, log, connector }, use) => {
      await use(new AlertsRagAgentBuilderChatClient(fetch, log, connector.id));
    },
    { scope: 'worker' },
  ],
  evaluateDataset: [
    ({ chatClient, evaluators, executorClient, log }, use) => {
      use(
        createEvaluateAlertsRagDataset({
          chatClient,
          evaluators,
          executorClient,
          log,
        })
      );
    },
    { scope: 'worker' },
  ],
});
