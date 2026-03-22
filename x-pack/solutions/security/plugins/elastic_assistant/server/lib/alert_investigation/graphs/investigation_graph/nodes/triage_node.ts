/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InvestigationGraphState } from '../state';
import { createTriageAgent } from '../../../agents';
import type { ActionsClientLlm } from '@kbn/langchain/server';
import type { ElasticsearchClient } from '@kbn/core/server';

/**
 * Triage Node
 *
 * Executes the Triage Agent to classify alert severity and attack type
 */
export const createTriageNode = (
  llmClient: ActionsClientLlm,
  esClient: ElasticsearchClient,
  logger: Logger
) => {
  return async (state: typeof InvestigationGraphState.State): Promise<Partial<typeof InvestigationGraphState.Update>> => {
    const nodeStart = Date.now();
    logger.info(`[Triage Node] Starting triage for alert ${state.alert._id}`);

    try {
      const triageAgent = createTriageAgent(llmClient, esClient);
      const triageResult = await triageAgent.execute(state.alert);

      const nodeLatency = Date.now() - nodeStart;

      logger.info(
        `[Triage Node] Completed in ${nodeLatency}ms: ${triageResult.classification} - ${triageResult.attackType} (${triageResult.confidence}% confidence)`
      );

      return {
        triage: triageResult,
        agentLatencies: { triage: nodeLatency },
      };
    } catch (error) {
      logger.error(`[Triage Node] Failed: ${error.message}`);
      return {
        errors: [`Triage failed: ${error.message}`],
      };
    }
  };
};
