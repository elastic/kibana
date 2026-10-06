/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE,
  EVAL_TAG_PREFIX,
  SECURITY_SOLUTION_INTERNAL_API_VERSION,
} from './constants';

/**
 * Configures the current space so the managed alert-analysis workflow runs against the
 * model under test. The workflow reads these values from uiSettings at run time (via its
 * `fetch_runtime_config` step) and gates its per-alert loop on `workflowEnabled` +
 * a non-empty `connectorId`, so this must be set before any run.
 *
 * `connectorId` is pinned to the current Playwright project's connector so the workflow's
 * `ai.agent` step uses the same model the suite is evaluating. Auto-close is disabled so
 * the eval never mutates alert status (we only read the classification verdict).
 */
export const configureAlertAnalysisWorkflow = async ({
  fetch,
  log,
  connectorId,
  agentId,
  tagPrefix = EVAL_TAG_PREFIX,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  connectorId: string;
  agentId: string;
  tagPrefix?: string;
}): Promise<void> => {
  log.info(
    `Configuring alert-analysis workflow settings (connectorId=${connectorId}, agentId=${agentId})`
  );

  await fetch(ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE, {
    method: 'PUT',
    version: SECURITY_SOLUTION_INTERNAL_API_VERSION,
    headers: { 'elastic-api-version': SECURITY_SOLUTION_INTERNAL_API_VERSION },
    body: JSON.stringify({
      workflowEnabled: true,
      connectorId,
      agentId,
      createConversation: false,
      autoCloseEnabled: false,
      autoCloseConfidenceScoreMinThreshold: 0.9,
      autoCloseConfidenceScoreMaxThreshold: 1,
      tagPrefix,
    }),
  });
};
