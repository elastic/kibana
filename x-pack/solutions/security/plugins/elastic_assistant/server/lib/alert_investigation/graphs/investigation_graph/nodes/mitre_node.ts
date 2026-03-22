/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InvestigationGraphState } from '../state';
import { createMitreMapperAgent, generateAttackNavigatorLayer } from '../../../agents';
import type { ActionsClientLlm } from '@kbn/langchain/server';

/**
 * MITRE Mapper Node
 *
 * Executes the MITRE Mapper Agent to map alert to ATT&CK framework
 */
export const createMitreNode = (llmClient: ActionsClientLlm, logger: Logger) => {
  return async (state: typeof InvestigationGraphState.State): Promise<Partial<typeof InvestigationGraphState.Update>> => {
    const nodeStart = Date.now();
    logger.info(`[MITRE Node] Starting MITRE mapping for alert ${state.alert._id}`);

    try {
      const mitreAgent = createMitreMapperAgent(llmClient);
      const mitreMapping = await mitreAgent.execute(state.alert, state.triage);

      // Generate ATT&CK Navigator layer
      mitreMapping.attackNavigatorLayer = generateAttackNavigatorLayer(
        state.alert._id,
        mitreMapping
      );

      const nodeLatency = Date.now() - nodeStart;

      logger.info(
        `[MITRE Node] Completed in ${nodeLatency}ms: ${mitreMapping.techniques.length} techniques, ${mitreMapping.tactics.length} tactics`
      );

      return {
        mitreMapping,
        agentLatencies: { mitre: nodeLatency },
      };
    } catch (error) {
      logger.error(`[MITRE Node] Failed: ${error.message}`);
      return {
        errors: [`MITRE mapping failed: ${error.message}`],
      };
    }
  };
};
