/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { SecurityEvalChatClient } from './chat_client';
import type { EvaluateEntityAnalyticsDataset } from './evaluate_dataset';
import { createEvaluateEntityAnalyticsDataset } from './evaluate_dataset';

export const evaluate = base.extend<
  {},
  {
    chatClient: SecurityEvalChatClient;
    evaluateDataset: EvaluateEntityAnalyticsDataset;
  }
>({
  chatClient: [
    async ({ fetch, log, connector }, use) => {
      const chatClient = new SecurityEvalChatClient(fetch, log, connector.id);
      await use(chatClient);
    },
    { scope: 'worker' },
  ],
  evaluateDataset: [
    ({ chatClient, evaluators, executorClient, inferenceClient, log }, use) => {
      use(
        createEvaluateEntityAnalyticsDataset({
          chatClient,
          evaluators,
          executorClient,
          inferenceClient,
          log,
        })
      );
    },
    { scope: 'worker' },
  ],
});
