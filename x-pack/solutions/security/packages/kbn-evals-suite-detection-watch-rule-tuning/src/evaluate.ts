/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base, selectEvaluators, tags } from '@kbn/evals';
import type { EsClient } from '@kbn/scout';
import type { ConnectorPinClient } from './model_attribution';
import { pinWorkflowConnector } from './model_attribution';

/**
 * Extends the base `@kbn/evals` fixture with an auto, worker-scoped pin of the
 * space-default AI connector.
 *
 * The tuning review's `diagnose_rule` step is an `ai.agent` step whose
 * manual-trigger schema rejects extra inputs (`additionalProperties: false`), so
 * the connector cannot be passed per run — the step resolves
 * `genAiSettings:defaultAIConnector` server-side. Without this pin the workflow
 * runs the stack's own default connector while `evals start --model <connector>`
 * stamps `task_model` with the eval connector, and every score doc of this suite
 * attributes its numbers to a model the workflow never called.
 *
 * The pin is verified by read-back (and again against the run's own chat spans in
 * `assertWorkflowModelMatches`), so a pin that does not stick fails the run
 * instead of silently mis-attributing it.
 *
 * Everything else (executorClient, inferenceClient, connector, evaluators, log)
 * comes from the base fixture unchanged.
 */
export const evaluate = base.extend<
  {},
  { pinnedWorkflowConnector: string; traceEsClient: EsClient }
>({
  // Agent Builder child spans are exported to local ES via ElasticsearchOtlpExporter,
  // not to the golden cluster TRACING_ES_URL points at.
  traceEsClient: [
    async ({ esClient, log }, use) => {
      log.info('[traceEsClient] using local Scout ES for agent-builder traces');
      await use(esClient);
    },
    { scope: 'worker' },
  ],
  pinnedWorkflowConnector: [
    async ({ kbnClient, connector, log }, use) => {
      const pinned = await pinWorkflowConnector({
        kbnClient: kbnClient as unknown as ConnectorPinClient,
        connector,
        log,
      });
      await use(pinned);
    },
    { scope: 'worker', auto: true },
  ],
});

export { tags, selectEvaluators };
