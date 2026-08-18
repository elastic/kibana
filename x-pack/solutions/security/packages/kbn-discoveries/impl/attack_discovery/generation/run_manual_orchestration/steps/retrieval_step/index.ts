/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, KibanaRequest, Logger } from '@kbn/core/server';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import type { IEventLogger } from '@kbn/event-log-plugin/server';

import { logHealthCheck } from '../../../../../lib/log_health_check';
import { combineAlertRetrievalResults } from '../../../combine_alert_retrieval_results';
import type {
  AlertRetrievalResult,
  WorkflowsManagementApi,
} from '../../../invoke_alert_retrieval_workflow';
import { invokeCustomAlertRetrievalWorkflows } from '../../../invoke_custom_alert_retrieval_workflows';
import type { AttackDiscoverySource } from '../../../../persistence/event_logging';
import type { ParsedApiConfig, WorkflowConfig } from '../../../types';
import { createDefaultRetrievalPromise } from './helpers/create_default_retrieval_promise';
import { resolveCustomSettledResults } from './helpers/resolve_custom_settled_results';
import { resolveLegacySettledResult } from './helpers/resolve_default_settled_result';
import { validateRetrievalResults } from './helpers/validate_retrieval_results';

export interface RetrievalStepParams {
  alertsIndexPattern: string;
  anonymizationFields: AnonymizationFieldResponse[];
  apiConfig: ParsedApiConfig;
  authenticatedUser: AuthenticatedUser;
  defaultAlertRetrievalWorkflowId: string;
  end?: string;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  filter?: Record<string, unknown>;
  logger: Logger;
  /**
   * Maximum time to wait for the retrieval workflow to complete, in
   * milliseconds. Threaded from the orchestration's remaining pipeline budget
   * so the consumer-side poll never gives up before the workflow's own step
   * timeout (notably the skill `ai.agent` step's 10m timeout).
   */
  maxWaitMs?: number;
  request: KibanaRequest;
  size?: number;
  source?: AttackDiscoverySource;
  spaceId: string;
  start?: string;
  workflowConfig: WorkflowConfig;
  workflowsManagementApi: WorkflowsManagementApi;
}

export const runRetrievalStep = async ({
  alertsIndexPattern,
  anonymizationFields,
  apiConfig,
  authenticatedUser,
  defaultAlertRetrievalWorkflowId,
  end,
  eventLogger,
  eventLogIndex,
  executionUuid,
  filter,
  logger,
  maxWaitMs,
  request,
  size,
  source,
  spaceId,
  start,
  workflowConfig,
  workflowsManagementApi,
}: RetrievalStepParams): Promise<AlertRetrievalResult> => {
  logHealthCheck(logger, 'retrieval', {
    alertsIndexPattern,
    anonymizationFieldCount: anonymizationFields.length,
    connectorId: apiConfig.connector_id,
    customWorkflowIds: workflowConfig.alert_retrieval_workflow_ids,
    defaultAlertRetrievalWorkflowId,
    retrievalMode: workflowConfig.alert_retrieval_mode,
  });

  const defaultRetrievalPromise = createDefaultRetrievalPromise({
    alertsIndexPattern,
    anonymizationFields,
    apiConfig,
    authenticatedUser,
    alertRetrievalMode: workflowConfig.alert_retrieval_mode,
    defaultAlertRetrievalWorkflowId,
    defaultRetrievalEnabled: workflowConfig.default_retrieval_enabled,
    end,
    esqlQuery: workflowConfig.esql_query,
    eventLogger,
    eventLogIndex,
    executionUuid,
    filter,
    logger,
    ...(maxWaitMs != null ? { maxWaitMs } : {}),
    request,
    size,
    source,
    spaceId,
    start,
    workflowsManagementApi,
  });

  // Toggle 3: only run the user-created alert retrieval workflows when enabled.
  const customWorkflowIds = workflowConfig.alert_retrieval_workflows_enabled
    ? workflowConfig.alert_retrieval_workflow_ids
    : [];

  const customPromise = invokeCustomAlertRetrievalWorkflows({
    alertsIndexPattern,
    anonymizationFields,
    apiConfig,
    authenticatedUser,
    eventLogger,
    eventLogIndex,
    executionUuid,
    filter,
    logger,
    request,
    size,
    source,
    spaceId,
    workflowIds: customWorkflowIds,
    workflowsManagementApi,
  });

  if (!workflowConfig.default_retrieval_enabled) {
    logger.info('Default alert retrieval disabled; skipping');
  }

  const [legacySettled, customSettled] = await Promise.allSettled([
    defaultRetrievalPromise,
    customPromise,
  ]);

  const legacyResult = resolveLegacySettledResult({
    legacySettled,
    logger,
  });

  const customResults = resolveCustomSettledResults({
    customSettled,
    logger,
  });

  validateRetrievalResults({
    customResults,
    legacyResult,
    skillEnabled: workflowConfig.skill_enabled,
  });

  const alertRetrievalResult = combineAlertRetrievalResults({
    apiConfig,
    customResults,
    legacyResult,
  });

  logger.info(
    `Combined alert retrieval completed: ${alertRetrievalResult.alertsContextCount} total alerts` +
      ` (default: ${legacyResult?.alertsContextCount ?? 0}, custom: ${customResults.reduce(
        (sum, r) => sum + r.alertsContextCount,
        0
      )})`
  );

  return alertRetrievalResult;
};
