/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InvestigationGraphState } from '../state';
import { createRemediationAgent } from '../../../agents';
import type { ActionsClientLlm } from '@kbn/langchain/server';

/**
 * Remediation Node
 *
 * Executes the Remediation Agent to recommend response actions
 */
export const createRemediationNode = (llmClient: ActionsClientLlm, logger: Logger) => {
  return async (
    state: typeof InvestigationGraphState.State
  ): Promise<Partial<typeof InvestigationGraphState.Update>> => {
    const nodeStart = Date.now();
    logger.info(
      `[Remediation Node] Starting remediation recommendations for alert ${state.alert._id}`
    );

    try {
      const remediationAgent = createRemediationAgent(llmClient);
      const remediation = await remediationAgent.execute(
        state.alert,
        state.triage,
        state.mitreMapping,
        state.ctiContext,
        state.investigation
      );

      const nodeLatency = Date.now() - nodeStart;

      logger.info(
        `[Remediation Node] Completed in ${nodeLatency}ms: ${remediation.immediateActions.length} immediate actions, ${remediation.runbook.length} runbook steps`
      );

      return {
        remediation,
        agentLatencies: { remediation: nodeLatency },
      };
    } catch (error) {
      logger.error(`[Remediation Node] Failed: ${error.message}`);
      return {
        errors: [`Remediation failed: ${error.message}`],
      };
    }
  };
};
