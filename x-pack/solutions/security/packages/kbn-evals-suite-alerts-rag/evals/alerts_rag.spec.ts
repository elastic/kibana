/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../src/evaluate';
import { alertsRagDataset } from '../src/datasets';

const ELASTIC_ASSISTANT_CAPABILITIES_PATH = '/internal/elastic_assistant/capabilities';
const ACTIONS_CONNECTOR_PATH = '/api/actions/connector';

evaluate.describe('Alerts RAG', { tag: tags.stateful.classic }, () => {
  evaluate.beforeAll(async ({ kbnClient, evaluationConnector, log }) => {
    log.info('[alerts-rag] beforeAll: verifying Security AI Assistant API reachability');
    try {
      await kbnClient.request({
        path: ELASTIC_ASSISTANT_CAPABILITIES_PATH,
        method: 'GET',
        retries: 0,
      });
      log.info('[alerts-rag] beforeAll: Security AI Assistant API is reachable');
    } catch (error) {
      throw new Error(
        `Security AI Assistant API is not reachable at ${ELASTIC_ASSISTANT_CAPABILITIES_PATH}. ` +
          `Ensure the elastic_assistant plugin is enabled and the Kibana instance is running. ` +
          `Original error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    log.info(
      `[alerts-rag] beforeAll: verifying evaluator connector availability (id=${evaluationConnector.id})`
    );
    try {
      await kbnClient.request({
        path: `${ACTIONS_CONNECTOR_PATH}/${encodeURIComponent(evaluationConnector.id)}`,
        method: 'GET',
        retries: 0,
      });
      log.info(
        `[alerts-rag] beforeAll: evaluator connector is available (id=${evaluationConnector.id}, name="${evaluationConnector.name}")`
      );
    } catch (error) {
      throw new Error(
        `Evaluator connector "${evaluationConnector.name}" (id=${evaluationConnector.id}) is not available. ` +
          `Ensure the connector is configured in Kibana. ` +
          `Original error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });

  evaluate('alerts RAG dataset', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'Alerts RAG Regression (Episodes 1-8)',
        description:
          'Security AI Assistant alerts RAG evaluation dataset migrated from LangSmith. ' +
          'Tests retrieval relevance, answer faithfulness, and correctness across single-alert queries, ' +
          'multi-alert correlation, temporal queries, and field-specific lookups.',
        examples: alertsRagDataset,
      },
    });
  });
});
