/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_ALERT_ANALYSIS_WORKFLOW_ID } from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { IUiSettingsClient, Logger } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import {
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AUTO_CLOSE_CONFIDENCE_SCORE_MAX_THRESHOLD,
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AUTO_CLOSE_CONFIDENCE_SCORE_MIN_THRESHOLD,
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AUTO_CLOSE_ENABLED,
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_CONNECTOR_ID,
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_CREATE_CONVERSATION,
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_ENABLED,
} from '@kbn/management-settings-ids';
import {
  initSecurityManagedWorkflowsClient,
  type SecurityManagedWorkflowsClient,
} from '../managed_workflows';

/**
 * The six alert-analysis settings. Read from a space-scoped `uiSettings` client (by the settings
 * routes and by the workflow's runtime-config route), never baked into the workflow document: the
 * workflow is installed once in the global space and reads these live per space at run time.
 */
export interface SecurityAlertAnalysisWorkflowSettings {
  workflowEnabled: boolean;
  autoCloseEnabled: boolean;
  autoCloseConfidenceScoreMinThreshold: number;
  autoCloseConfidenceScoreMaxThreshold: number;
  connectorId: string;
  createConversation: boolean;
}

/**
 * Reads the six `alertAnalysisWorkflow*` uiSettings from an already space-scoped
 * `IUiSettingsClient` and shapes them into the workflow's settings.
 */
export const readSecurityAlertAnalysisWorkflowSettings = async (
  uiSettingsClient: Pick<IUiSettingsClient, 'get'>
): Promise<SecurityAlertAnalysisWorkflowSettings> => ({
  workflowEnabled: await uiSettingsClient.get<boolean>(
    SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_ENABLED
  ),
  autoCloseEnabled: await uiSettingsClient.get<boolean>(
    SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AUTO_CLOSE_ENABLED
  ),
  autoCloseConfidenceScoreMinThreshold: await uiSettingsClient.get<number>(
    SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AUTO_CLOSE_CONFIDENCE_SCORE_MIN_THRESHOLD
  ),
  autoCloseConfidenceScoreMaxThreshold: await uiSettingsClient.get<number>(
    SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AUTO_CLOSE_CONFIDENCE_SCORE_MAX_THRESHOLD
  ),
  connectorId: await uiSettingsClient.get<string>(
    SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_CONNECTOR_ID
  ),
  createConversation: await uiSettingsClient.get<boolean>(
    SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_CREATE_CONVERSATION
  ),
});

/**
 * Installs the alert analysis workflow once in the global space. A global workflow is visible from,
 * and executable in, every space (including spaces created later), with executions stamped in the
 * invoking space's context, so there is no per-space install, fan-out, or self-heal to manage.
 */
export const installSecurityAlertAnalysisWorkflow = async ({
  managedWorkflowsClient,
}: {
  managedWorkflowsClient: SecurityManagedWorkflowsClient;
}): Promise<void> => {
  await managedWorkflowsClient.install(SECURITY_ALERT_ANALYSIS_WORKFLOW_ID, {
    spaceId: GLOBAL_WORKFLOW_SPACE_ID,
  });
};

/**
 * Plugin-start entry point: install the workflow, then mark managed workflows ready. `ready()` must
 * run only after the install resolves (it closes the startup window and triggers reconciliation), so
 * this awaits the install first, reusing a single client, in one try/catch. Intended to be called
 * once, fire-and-forget, from the plugin's `start()`.
 */
export const installSecurityAlertAnalysisWorkflowAndMarkReady = async ({
  workflowsExtensions,
  logger,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  logger: Logger;
}): Promise<void> => {
  try {
    const managedWorkflowsClient = await initSecurityManagedWorkflowsClient(workflowsExtensions);
    await installSecurityAlertAnalysisWorkflow({ managedWorkflowsClient });
    await managedWorkflowsClient.ready();
  } catch (error) {
    logger.warn('Failed to install the alert analysis workflow', { error });
  }
};
