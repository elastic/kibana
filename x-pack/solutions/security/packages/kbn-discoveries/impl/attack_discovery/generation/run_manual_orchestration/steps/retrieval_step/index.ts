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
import type { ParsedApiConfig, WorkflowConfig } from '../../../types';
import { createLegacyRetrievalPromise } from './helpers/create_default_retrieval_promise';
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
  request: KibanaRequest;
  size?: number;
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
  request,
  size,
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
    retrievalMode: workflowConfig.default_alert_retrieval_mode,
  });

  const legacyPromise = createLegacyRetrievalPromise({
    alertsIndexPattern,
    anonymizationFields,
    apiConfig,
    authenticatedUser,
    defaultAlertRetrievalMode: workflowConfig.default_alert_retrieval_mode,
    defaultAlertRetrievalWorkflowId,
    end,
    esqlQuery: workflowConfig.esql_query,
    eventLogger,
    eventLogIndex,
    executionUuid,
    filter,
    logger,
    providedContext: workflowConfig.provided_context,
    request,
    size,
    spaceId,
    start,
    workflowsManagementApi,
  });

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
    spaceId,
    workflowIds: workflowConfig.alert_retrieval_workflow_ids,
    workflowsManagementApi,
  });

  if (workflowConfig.default_alert_retrieval_mode === 'disabled') {
    logger.info('Default alert retrieval disabled; skipping');
  }

  const [legacySettled, customSettled] = await Promise.allSettled([legacyPromise, customPromise]);

  const legacyResult = resolveLegacySettledResult({
    legacySettled,
    logger,
  });

  const customResults = resolveCustomSettledResults({
    customSettled,
    logger,
  });

  validateRetrievalResults({ customResults, legacyResult });

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
