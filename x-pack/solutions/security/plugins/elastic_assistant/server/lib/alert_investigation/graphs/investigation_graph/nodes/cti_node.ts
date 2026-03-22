/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InvestigationGraphState } from '../state';
import { createCTIEnrichmentAgent } from '../../../agents';
import type { ActionsClientLlm } from '@kbn/langchain/server';
import type { ElasticsearchClient } from '@kbn/core/server';

/**
 * CTI Enrichment Node
 *
 * Executes the CTI Enrichment Agent to look up threat intelligence
 */
export const createCTINode = (
  llmClient: ActionsClientLlm,
  esClient: ElasticsearchClient,
  logger: Logger
) => {
  return async (
    state: typeof InvestigationGraphState.State
  ): Promise<Partial<typeof InvestigationGraphState.Update>> => {
    const nodeStart = Date.now();
    logger.info(`[CTI Node] Starting threat intelligence enrichment for alert ${state.alert._id}`);

    try {
      const ctiAgent = createCTIEnrichmentAgent(llmClient, esClient);
      const ctiContext = await ctiAgent.execute(state.alert, state.triage);

      const nodeLatency = Date.now() - nodeStart;

      logger.info(
        `[CTI Node] Completed in ${nodeLatency}ms: ${ctiContext.iocs.length} IOCs analyzed, Actor: ${ctiContext.threatActor || 'Unknown'}`
      );

      return {
        ctiContext,
        agentLatencies: { cti: nodeLatency },
      };
    } catch (error) {
      logger.error(`[CTI Node] Failed: ${error.message}`);
      return {
        errors: [`CTI enrichment failed: ${error.message}`],
      };
    }
  };
};
