/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { MultiStepAgentBuilderChatClient } from './chat_client';
import type { EvaluateMultiStepDataset } from './evaluate_dataset';
import { createEvaluateMultiStepDataset } from './evaluate_dataset';

export const evaluate = base.extend<
  {},
  {
    chatClient: MultiStepAgentBuilderChatClient;
    evaluateDataset: EvaluateMultiStepDataset;
  }
>({
  chatClient: [
    async ({ fetch, log, connector }, use) => {
      await use(new MultiStepAgentBuilderChatClient(fetch, log, connector.id));
    },
    { scope: 'worker' },
  ],
  evaluateDataset: [
    ({ chatClient, evaluators, executorClient, traceEsClient, log }, use) => {
      use(
        createEvaluateMultiStepDataset({
          chatClient,
          evaluators,
          executorClient,
          traceEsClient,
          log,
        })
      );
    },
    { scope: 'worker' },
  ],
});
