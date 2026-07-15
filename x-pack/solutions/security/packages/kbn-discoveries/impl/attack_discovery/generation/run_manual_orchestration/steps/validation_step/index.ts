/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AuthenticatedUser,
  ElasticsearchClient,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
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
import type { AttackDiscoverySource, SourceMetadata } from '../../../../persistence/event_logging';
import type { WorkflowConfig } from '../../../types';

export interface ValidationSucceededOutcome {
  alertRetrievalResult: AlertRetrievalResult;
  generationResult: GenerationWorkflowResult;
  outcome: 'validation_succeeded';
  validationResult: ValidationResult;
}

/**
 * Terminal outcome for the zero-alert short-circuit: when alert retrieval
 * returns no alerts, the pipeline skips both generation and validation (no LLM
 * call) and surfaces this outcome instead.
 */
export interface NoAlertsOutcome {
  alertRetrievalResult: AlertRetrievalResult;
  outcome: 'no_alerts';
}

export type ManualOrchestrationOutcome = NoAlertsOutcome | ValidationSucceededOutcome;

export interface ValidationStepParams {
  alertRetrievalResult: AlertRetrievalResult;
  authenticatedUser: AuthenticatedUser;
  /**
   * Isomorphic sha256 hasher injected by the scheduled executor for FF-on
   * scheduled cross-execution de-duplication. Present only on the scheduled path.
   */
  computeSha256Hash?: (input: string) => string;
  defaultValidationWorkflowId: string;
  /**
   * Trusted in-process Elasticsearch client, threaded down for FF-on scheduled
   * cross-execution de-duplication. Present only on the scheduled path.
   */
  esClient?: ElasticsearchClient;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  logger: Logger;
  generationResult: GenerationWorkflowResult;
  maxWaitMs?: number;
  request: KibanaRequest;
  source?: AttackDiscoverySource;
  /**
   * Source metadata carrying the trusted in-process `ruleId` (schedule owner),
   * used as the alert hash owner for FF-on scheduled de-duplication.
   */
  sourceMetadata?: SourceMetadata;
  spaceId: string;
  workflowConfig: WorkflowConfig;
  workflowsManagementApi: WorkflowsManagementApi;
}

export const runValidationStep = async ({
  alertRetrievalResult,
  authenticatedUser,
  computeSha256Hash,
  defaultValidationWorkflowId,
  esClient,
  eventLogger,
  eventLogIndex,
  executionUuid,
  logger,
  generationResult,
  maxWaitMs,
  request,
  source,
  sourceMetadata,
  spaceId,
  workflowConfig,
  workflowsManagementApi,
}: ValidationStepParams): Promise<ValidationSucceededOutcome> => {
  logHealthCheck(logger, 'validation', {
    defaultValidationWorkflowId,
    discoveryCount: generationResult.attackDiscoveries.length,
    validationWorkflowId: workflowConfig.validation_workflow_id,
  });

  try {
    const validationResult = await invokeValidationWorkflow({
      alertRetrievalResult,
      authenticatedUser,
      computeSha256Hash,
      defaultValidationWorkflowId,
      enableFieldRendering: true,
      esClient,
      eventLogger,
      eventLogIndex,
      executionUuid,
      logger,
      generationResult,
      maxWaitMs,
      request,
      ruleId: sourceMetadata?.ruleId,
      source,
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
    throw validationError;
  }
};
