/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { AiSocEvalChatClient } from './chat_client';
import type { EvaluateAiSocDataset } from './evaluate_dataset';
import { createEvaluateAiSocDataset } from './evaluate_dataset';

export const evaluate = base.extend<
  {},
  {
    chatClient: AiSocEvalChatClient;
    evaluateDataset: EvaluateAiSocDataset;
  }
>({
  chatClient: [
    async ({ fetch, log, connector }, use) => {
      const chatClient = new AiSocEvalChatClient(fetch, log, connector.id);
      await use(chatClient);
    },
    { scope: 'worker' },
  ],
  evaluateDataset: [
    ({ chatClient, evaluators, executorClient }, use) => {
      use(
        createEvaluateAiSocDataset({
          chatClient,
          evaluators,
          executorClient,
        })
      );
    },
    { scope: 'worker' },
  ],
});
