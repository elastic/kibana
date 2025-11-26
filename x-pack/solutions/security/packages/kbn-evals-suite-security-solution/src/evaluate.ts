/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base, createDefaultTerminalReporter } from '@kbn/evals';
import {
  SecurityKnowledgeBaseClient,
  SecurityAIAssistantEvaluationChatClient,
  AttackDiscoveryEvaluationClient,
  DefendInsightsEvaluationClient,
} from './clients';
import {
  createEvaluateSecurityDataset,
  createEvaluateAttackDiscoveryDataset,
  createEvaluateDefendInsightsDataset,
  type EvaluateSecurityDataset,
  type EvaluateAttackDiscoveryDataset,
  type EvaluateDefendInsightsDataset,
} from './evaluators';

export const evaluate = base.extend<
  {},
  {
    knowledgeBaseClient: SecurityKnowledgeBaseClient;
    chatClient: SecurityAIAssistantEvaluationChatClient;
    attackDiscoveryClient: AttackDiscoveryEvaluationClient;
    defendInsightsClient: DefendInsightsEvaluationClient;
    evaluateDataset: EvaluateSecurityDataset;
    evaluateAttackDiscoveryDataset: EvaluateAttackDiscoveryDataset;
    evaluateDefendInsightsDataset: EvaluateDefendInsightsDataset;
  }
>({
  knowledgeBaseClient: [
    async ({ fetch, log, esClient }, use) => {
      const kbClient = new SecurityKnowledgeBaseClient(fetch, log, esClient);
      await use(kbClient);
    },
    { scope: 'worker' },
  ],
  chatClient: [
    async ({ fetch, log, connector }, use) => {
      const chatClient = new SecurityAIAssistantEvaluationChatClient(fetch, log, connector.id);
      await use(chatClient);
    },
    { scope: 'worker' },
  ],
  attackDiscoveryClient: [
    async ({ fetch, log, connector }, use) => {
      const adClient = new AttackDiscoveryEvaluationClient(fetch, log, connector.id);
      await use(adClient);
    },
    { scope: 'worker' },
  ],
  defendInsightsClient: [
    async ({ fetch, log, connector }, use) => {
      const diClient = new DefendInsightsEvaluationClient(fetch, log, connector.id);
      await use(diClient);
    },
    { scope: 'worker' },
  ],
  evaluateDataset: [
    ({ chatClient, evaluators, phoenixClient }, use) => {
      use(
        createEvaluateSecurityDataset({
          chatClient,
          evaluators,
          phoenixClient,
        })
      );
    },
    { scope: 'worker' },
  ],
  evaluateAttackDiscoveryDataset: [
    ({ attackDiscoveryClient, evaluators, phoenixClient }, use) => {
      use(
        createEvaluateAttackDiscoveryDataset({
          attackDiscoveryClient,
          evaluators,
          phoenixClient,
        })
      );
    },
    { scope: 'worker' },
  ],
  evaluateDefendInsightsDataset: [
    ({ defendInsightsClient, evaluators, phoenixClient }, use) => {
      use(
        createEvaluateDefendInsightsDataset({
          defendInsightsClient,
          evaluators,
          phoenixClient,
        })
      );
    },
    { scope: 'worker' },
  ],
  reportModelScore: [
    async (_, use) => {
      await use(createDefaultTerminalReporter());
    },
    { scope: 'worker' },
  ],
});
