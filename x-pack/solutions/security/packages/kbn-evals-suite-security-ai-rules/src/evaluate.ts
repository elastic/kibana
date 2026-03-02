/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Phoenix executor is omitted intentionally — this suite runs against a local
// Kibana instance, not an external Phoenix/Arize tracing endpoint.
import type { BoundInferenceClient } from '@kbn/inference-common';
import { evaluate as base } from '@kbn/evals';
import { SecurityRuleGenerationClient } from './chat_client';

export const evaluate = base.extend<
  {},
  {
    chatClient: SecurityRuleGenerationClient;
    evaluationInferenceClient: BoundInferenceClient;
  }
>({
  chatClient: [
    async ({ fetch, log, connector }, use) => {
      await use(new SecurityRuleGenerationClient(fetch, log, connector.id));
    },
    {
      scope: 'worker',
    },
  ],
  evaluationInferenceClient: [
    async ({ inferenceClient, evaluationConnector }, use) => {
      await use(inferenceClient.bindTo({ connectorId: evaluationConnector.id }));
    },
    {
      scope: 'worker',
    },
  ],
});
