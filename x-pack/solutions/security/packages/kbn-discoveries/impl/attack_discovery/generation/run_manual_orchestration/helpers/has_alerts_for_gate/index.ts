/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import { countGateScopeAlerts } from '../../../count_gate_scope_alerts';

export interface HasAlertsForGateParams {
  alertsIndexPattern: string;
  /** Number of candidate alerts produced by the retrieval phase. */
  candidateCount: number;
  end?: string;
  esClient?: ElasticsearchClient;
  executionUuid: string;
  logger: Logger;
  /** Whether the gate may retrieve net-new alerts of its own. */
  skillEnabled: boolean;
  start?: string;
}

/**
 * Returns whether the ground-truthing gate has any alerts to work on, so a run with nothing to analyze can skip the gate's LLM calls.
 */
export const hasAlertsForGate = async ({
  alertsIndexPattern,
  candidateCount,
  end,
  esClient,
  executionUuid,
  logger,
  skillEnabled,
  start,
}: HasAlertsForGateParams): Promise<boolean> => {
  if (candidateCount > 0) {
    return true;
  }

  // Without the skill, the gate can only remove candidates, and there are none.
  if (!skillEnabled) {
    logger.info(
      `Skipping the ground-truthing gate: no candidate alerts and the skill is disabled (execution_uuid=${executionUuid})`
    );

    return false;
  }

  if (esClient == null) {
    return true;
  }

  try {
    const count = await countGateScopeAlerts({ alertsIndexPattern, end, esClient, start });

    if (count > 0) {
      return true;
    }

    logger.info(
      `Skipping the ground-truthing gate: no open or acknowledged alerts in the run's time range or the last 7 days (execution_uuid=${executionUuid})`
    );

    return false;
  } catch (error) {
    // Fail open: an unavailable check must not turn into a false "no alerts" result.
    logger.warn(
      `Failed to count alerts before the ground-truthing gate; running the gate (execution_uuid=${executionUuid}): ${
        error instanceof Error ? error.message : String(error)
      }`
    );

    return true;
  }
};
