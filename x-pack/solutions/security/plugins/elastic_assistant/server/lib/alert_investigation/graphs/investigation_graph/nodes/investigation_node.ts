/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InvestigationGraphState } from '../state';
import { createInvestigationAgent } from '../../../agents';
import type { ActionsClientLlm } from '@kbn/langchain/server';
import type { ElasticsearchClient } from '@kbn/core/server';

/**
 * Investigation Node
 *
 * Executes the Investigation Agent for deep analysis with hypothesis testing
 */
export const createInvestigationNode = (
  llmClient: ActionsClientLlm,
  esClient: ElasticsearchClient,
  logger: Logger
) => {
  return async (
    state: typeof InvestigationGraphState.State
  ): Promise<Partial<typeof InvestigationGraphState.Update>> => {
    const nodeStart = Date.now();
    logger.info(
      `[Investigation Node] Starting deep investigation for alert ${state.alert._id}`
    );

    try {
      const investigationAgent = createInvestigationAgent(llmClient, esClient);
      const investigation = await investigationAgent.execute(
        state.alert,
        state.triage,
        state.mitreMapping,
        state.ctiContext
      );

      const nodeLatency = Date.now() - nodeStart;

      logger.info(
        `[Investigation Node] Completed in ${nodeLatency}ms: Hypothesis formed, ${investigation.evidence.length} evidence items, ${investigation.blastRadius.affectedHosts} hosts affected`
      );

      return {
        investigation,
        agentLatencies: { investigation: nodeLatency },
      };
    } catch (error) {
      logger.error(`[Investigation Node] Failed: ${error.message}`);
      return {
        errors: [`Investigation failed: ${error.message}`],
      };
    }
  };
};
