/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import type { EsClient } from '@kbn/scout';
import { AttackDiscoveryAgentBuilderChatClient } from './chat_client';
import { createEvaluateAttackDiscoveryAgentBuilderDataset } from './evaluate_dataset';

export const evaluate = base.extend<
  {},
  {
    chatClient: AttackDiscoveryAgentBuilderChatClient;
    evaluateDataset: ReturnType<typeof createEvaluateAttackDiscoveryAgentBuilderDataset>;
    traceEsClient: EsClient;
  }
>({
  // Agent Builder child spans are exported to the Kibana local ES via
  // ElasticsearchOtlpExporter, not to the golden cluster. Use the Scout local
  // client so trace-based evaluators can actually query the spans.
  traceEsClient: [
    async ({ esClient, log }, use) => {
      log.info('[traceEsClient] using local Scout ES for agent-builder traces');
      await use(esClient);
    },
    { scope: 'worker' },
  ],
  chatClient: [
    async ({ fetch, log, connector }, use) => {
      await use(new AttackDiscoveryAgentBuilderChatClient(fetch, log, connector.id));
    },
    { scope: 'worker' },
  ],
  evaluateDataset: [
    ({ chatClient, fetch, evaluators, executorClient, traceEsClient }, use) => {
      use(
        createEvaluateAttackDiscoveryAgentBuilderDataset({
          chatClient,
          fetch,
          evaluators,
          executorClient,
          traceEsClient,
        })
      );
    },
    { scope: 'worker' },
  ],
});
