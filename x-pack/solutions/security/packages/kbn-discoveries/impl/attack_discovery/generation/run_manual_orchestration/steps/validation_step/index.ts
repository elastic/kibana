/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, KibanaRequest, Logger } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';

import { logHealthCheck } from '../../../../../lib/log_health_check';
import type {
  AlertRetrievalResult,
  WorkflowsManagementApi,
} from '../../../invoke_alert_retrieval_workflow';
import type { GenerationWorkflowResult } from '../../../invoke_generation_workflow';
import {
  invokeValidationWorkflow,
  type ValidationResult,
} from '../../../invoke_validation_workflow';
import type { WorkflowConfig } from '../../../types';

export type ManualOrchestrationOutcome =
  | {
      outcome: 'validation_failed';
    }
  | {
      alertRetrievalResult: AlertRetrievalResult;
      generationResult: GenerationWorkflowResult;
      outcome: 'validation_succeeded';
      validationResult: ValidationResult;
    };

export interface ValidationStepParams {
  alertRetrievalResult: AlertRetrievalResult;
  authenticatedUser: AuthenticatedUser;
  defaultValidationWorkflowId: string;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  logger: Logger;
  generationResult: GenerationWorkflowResult;
  maxWaitMs?: number;
  persist?: boolean;
  request: KibanaRequest;
  spaceId: string;
  workflowConfig: WorkflowConfig;
  workflowsManagementApi: WorkflowsManagementApi;
}

export const runValidationStep = async ({
  alertRetrievalResult,
  authenticatedUser,
  defaultValidationWorkflowId,
  eventLogger,
  eventLogIndex,
  executionUuid,
  logger,
  generationResult,
  maxWaitMs,
  persist,
  request,
  spaceId,
  workflowConfig,
  workflowsManagementApi,
}: ValidationStepParams): Promise<ManualOrchestrationOutcome> => {
  logHealthCheck(logger, 'validation', {
    defaultValidationWorkflowId,
    discoveryCount: generationResult.attackDiscoveries.length,
    persist,
    validationWorkflowId: workflowConfig.validation_workflow_id,
  });

  try {
    const validationResult = await invokeValidationWorkflow({
      alertRetrievalResult,
      authenticatedUser,
      defaultValidationWorkflowId,
      enableFieldRendering: true,
      eventLogger,
      eventLogIndex,
      executionUuid,
      logger,
      generationResult,
      maxWaitMs,
      persist,
      request,
      spaceId,
      withReplacements: true,
      workflowConfig,
      workflowsManagementApi,
    });

    logger.info(
      `Validation completed: ${validationResult.validationSummary.persistedCount} discoveries stored`
    );

    return {
      alertRetrievalResult,
      generationResult,
      outcome: 'validation_succeeded',
      validationResult,
    };
  } catch (validationError) {
    const validationErrorMessage =
      validationError instanceof Error ? validationError.message : String(validationError);
    logger.error(`Validation workflow failed: ${validationErrorMessage}`);
    return { outcome: 'validation_failed' };
  }
};
