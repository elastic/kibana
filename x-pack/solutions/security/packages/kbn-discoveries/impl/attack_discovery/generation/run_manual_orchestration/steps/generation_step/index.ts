/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, KibanaRequest, Logger } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { AttackDiscoverySource, SourceMetadata } from '../../../../persistence/event_logging';

import { logHealthCheck } from '../../../../../lib/log_health_check';
import type {
  AlertRetrievalResult,
  WorkflowsManagementApi,
} from '../../../invoke_alert_retrieval_workflow';
import {
  invokeGenerationWorkflow,
  type GenerationWorkflowResult,
} from '../../../invoke_generation_workflow';
import type { ParsedApiConfig, WorkflowConfig } from '../../../types';

export interface GenerationStepParams {
  alertRetrievalResult: AlertRetrievalResult;
  alertsIndexPattern: string;
  apiConfig: ParsedApiConfig;
  authenticatedUser: AuthenticatedUser;
  end?: string;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  filter?: Record<string, unknown>;
  generationWorkflowId: string;
  logger: Logger;
  maxWaitMs?: number;
  request: KibanaRequest;
  size?: number;
  source?: AttackDiscoverySource;
  sourceMetadata?: SourceMetadata;
  spaceId: string;
  start?: string;
  workflowConfig: WorkflowConfig;
  workflowsManagementApi: WorkflowsManagementApi;
}

export const runGenerationStep = async ({
  alertRetrievalResult,
  alertsIndexPattern,
  apiConfig,
  authenticatedUser,
  end,
  eventLogger,
  eventLogIndex,
  executionUuid,
  filter,
  generationWorkflowId,
  logger,
  maxWaitMs,
  request,
  size,
  source,
  sourceMetadata,
  spaceId,
  start,
  workflowConfig,
  workflowsManagementApi,
}: GenerationStepParams): Promise<GenerationWorkflowResult> => {
  logHealthCheck(logger, 'generation', {
    alertCount: alertRetrievalResult.alertsContextCount,
    connectorId: apiConfig.connector_id,
    generationWorkflowId,
  });

  try {
    const generationResult = await invokeGenerationWorkflow({
      alertRetrievalResult,
      alertsIndexPattern,
      apiConfig,
      authenticatedUser,
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
      sourceMetadata,
      spaceId,
      start,
      workflowConfig,
      workflowId: generationWorkflowId,
      workflowsManagementApi,
    });

    logger.info(
      `Generation workflow completed: ${generationResult.attackDiscoveries.length} discoveries`
    );

    return generationResult;
  } catch (generationError) {
    const errorMessage =
      generationError instanceof Error ? generationError.message : String(generationError);
    logger.error(`Generation workflow failed: ${errorMessage}`);
    throw generationError;
  }
};
