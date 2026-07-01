/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { SecuritySkillsAgentBuilderChatClient } from './chat_client';
import type { EvaluateSecuritySkillsDataset } from './evaluate_dataset';
import { createEvaluateSecuritySkillsDataset } from './evaluate_dataset';

export const evaluate = base.extend<
  {},
  {
    chatClient: SecuritySkillsAgentBuilderChatClient;
    evaluateDataset: EvaluateSecuritySkillsDataset;
  }
>({
  chatClient: [
    async ({ fetch, log, connector }, use) => {
      await use(new SecuritySkillsAgentBuilderChatClient(fetch, log, connector.id));
    },
    { scope: 'worker' },
  ],
  evaluateDataset: [
    ({ chatClient, evaluators, executorClient, traceEsClient, log }, use) => {
      use(
        createEvaluateSecuritySkillsDataset({
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
