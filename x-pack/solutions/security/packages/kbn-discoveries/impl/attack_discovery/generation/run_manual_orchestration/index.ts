/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnalyticsServiceSetup,
  AuthenticatedUser,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { AttackDiscoverySource, SourceMetadata } from '../../persistence/event_logging';
import { AttackDiscoveryError } from '../../../lib/errors/attack_discovery_error';

import type { DefaultWorkflowIds, ParsedApiConfig, WorkflowConfig } from '../types';
import {
  classifyErrorCategory,
  reportStepFailure,
} from '../../../lib/telemetry/report_step_failure';
import type {
  AlertRetrievalResult,
  WorkflowsManagementApi,
} from '../invoke_alert_retrieval_workflow';
import type { GenerationWorkflowResult } from '../invoke_generation_workflow';
import { buildExecutionSummaryLog, type StepStatus } from './helpers/build_execution_summary_log';
import { PipelineStepError } from './helpers/pipeline_step_error';
import { runGenerationStep } from './steps/generation_step';
import { runRetrievalStep } from './steps/retrieval_step';
import { type ManualOrchestrationOutcome, runValidationStep } from './steps/validation_step';

export type { ManualOrchestrationOutcome } from './steps/validation_step';
export { PipelineStepError } from './helpers/pipeline_step_error';

/** Default maximum pipeline duration in milliseconds (10 minutes) */
const DEFAULT_PIPELINE_TIMEOUT_MS = 10 * 60 * 1000;

export const runManualOrchestration = async ({
  alertsIndexPattern,
  analytics,
  anonymizationFields,
  apiConfig,
  authenticatedUser,
  basePath,
  defaultWorkflowIds,
  end,
  eventLogger,
  eventLogIndex,
  executionUuid,
  filter,
  logger,
  persist,
  pipelineTimeoutMs = DEFAULT_PIPELINE_TIMEOUT_MS,
  request,
  size,
  source,
  sourceMetadata,
  spaceId,
  start,
  workflowConfig,
  workflowsManagementApi,
}: {
  alertsIndexPattern: string;
  analytics?: AnalyticsServiceSetup;
  anonymizationFields: AnonymizationFieldResponse[];
  apiConfig: ParsedApiConfig;
  authenticatedUser: AuthenticatedUser;
  basePath: string;
  defaultWorkflowIds: DefaultWorkflowIds;
  end?: string;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  filter?: Record<string, unknown>;
  logger: Logger;
  persist?: boolean;
  pipelineTimeoutMs?: number;
  request: KibanaRequest;
  size?: number;
  source?: AttackDiscoverySource;
  sourceMetadata?: SourceMetadata;
  spaceId: string;
  start?: string;
  workflowConfig: WorkflowConfig;
  workflowsManagementApi: WorkflowsManagementApi;
}) => {
  const {
    default_alert_retrieval: defaultAlertRetrievalWorkflowId,
    generation: generationWorkflowId,
    validate: defaultValidationWorkflowId,
  } = defaultWorkflowIds;

  logger.debug(
    () =>
      `Starting manual orchestration: default_mode=${
        workflowConfig.default_alert_retrieval_mode
      }, custom_workflow_ids=${JSON.stringify(
        workflowConfig.alert_retrieval_workflow_ids
      )}, pipelineTimeoutMs=${pipelineTimeoutMs}`
  );

  const orchestrationStart = Date.now();
  // Timing markers and step results are declared outside the try block so the
  // catch and finally blocks can reference them for telemetry and summary logging.
  let retrievalStartMs = 0;
  let generationStartMs = 0;
  let validationStartMs = 0;

  const stepTimings = { generation: 0, retrieval: 0, validation: 0 };

  let alertRetrievalResult: AlertRetrievalResult | undefined;
  let generationResult: GenerationWorkflowResult | undefined;
  let outcome: ManualOrchestrationOutcome | undefined;
  let failedStep: 'generation' | 'retrieval' | undefined;
  let failureError: string | undefined;

  const validationWorkflowId = workflowConfig.validation_workflow_id || defaultValidationWorkflowId;

  const getRemainingBudgetMs = (): number =>
    Math.max(0, pipelineTimeoutMs - (Date.now() - orchestrationStart));

  const assertBudgetRemaining = (phase: 'generation' | 'validation'): void => {
    const remainingMs = getRemainingBudgetMs();
    if (remainingMs <= 0) {
      throw new PipelineStepError({
        durationMs: Date.now() - orchestrationStart,
        message: `Pipeline budget exceeded (${pipelineTimeoutMs}ms) before starting ${phase} phase`,
        step: phase === 'generation' ? 'generation' : 'validation',
      });
    }
  };

  try {
    retrievalStartMs = Date.now();
    alertRetrievalResult = await runRetrievalStep({
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
    });
    stepTimings.retrieval = Date.now() - retrievalStartMs;

    assertBudgetRemaining('generation');

    generationStartMs = Date.now();
    generationResult = await runGenerationStep({
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
      maxWaitMs: getRemainingBudgetMs(),
      request,
      size,
      source,
      sourceMetadata,
      spaceId,
      start,
      workflowConfig,
      workflowsManagementApi,
    });
    stepTimings.generation = Date.now() - generationStartMs;

    assertBudgetRemaining('validation');

    validationStartMs = Date.now();
    outcome = await runValidationStep({
      alertRetrievalResult,
      authenticatedUser,
      defaultValidationWorkflowId,
      eventLogger,
      eventLogIndex,
      executionUuid,
      logger,
      generationResult,
      maxWaitMs: getRemainingBudgetMs(),
      persist,
      request,
      spaceId,
      workflowConfig,
      workflowsManagementApi,
    });
    stepTimings.validation = Date.now() - validationStartMs;

    if (outcome.outcome === 'validation_failed' && analytics != null) {
      reportStepFailure({
        analytics,
        logger,
        params: {
          duration_ms: stepTimings.validation,
          error_category: 'validation_error',
          execution_uuid: executionUuid,
          step: 'validation',
          workflow_id: validationWorkflowId,
        },
      });
    }

    return outcome;
  } catch (error) {
    failureError = error instanceof Error ? error.message : String(error);

    if (alertRetrievalResult == null) {
      failedStep = 'retrieval';
      stepTimings.retrieval = Date.now() - retrievalStartMs;
    } else {
      failedStep = 'generation';
      stepTimings.generation = Date.now() - generationStartMs;
    }

    const telemetryStep = failedStep === 'retrieval' ? 'alert_retrieval' : 'generation';
    const telemetryDurationMs =
      failedStep === 'retrieval' ? stepTimings.retrieval : stepTimings.generation;
    const telemetryWorkflowId =
      failedStep === 'retrieval' ? defaultAlertRetrievalWorkflowId : generationWorkflowId;

    if (analytics != null) {
      reportStepFailure({
        analytics,
        logger,
        params: {
          duration_ms: telemetryDurationMs,
          error_category: classifyErrorCategory(error),
          execution_uuid: executionUuid,
          step: telemetryStep,
          workflow_id: telemetryWorkflowId,
        },
      });
    }

    const errorCategory = error instanceof AttackDiscoveryError ? error.errorCategory : undefined;
    const failedWorkflowId = error instanceof AttackDiscoveryError ? error.workflowId : undefined;

    throw new PipelineStepError({
      cause: error,
      durationMs: telemetryDurationMs,
      errorCategory,
      failedWorkflowId,
      message: failureError,
      step: telemetryStep,
    });
  } finally {
    const totalDurationMs = Date.now() - orchestrationStart;

    const retrievalStatus: StepStatus =
      alertRetrievalResult != null
        ? 'succeeded'
        : failedStep === 'retrieval'
        ? 'failed'
        : 'not_started';
    const generationStatus: StepStatus =
      generationResult != null
        ? 'succeeded'
        : failedStep === 'generation'
        ? 'failed'
        : 'not_started';
    const validationStatus: StepStatus =
      outcome?.outcome === 'validation_succeeded'
        ? 'succeeded'
        : outcome?.outcome === 'validation_failed'
        ? 'failed'
        : 'not_started';

    logger.info(
      buildExecutionSummaryLog({
        alertsContextCount: alertRetrievalResult?.alertsContextCount ?? 0,
        basePath,
        persistedCount:
          outcome?.outcome === 'validation_succeeded'
            ? outcome.validationResult.validationSummary.persistedCount
            : 0,
        generationStep: {
          durationMs: stepTimings.generation,
          error: failedStep === 'generation' ? failureError : undefined,
          executions:
            generationResult != null
              ? [
                  {
                    workflowId: generationResult.workflowId,
                    workflowRunId: generationResult.workflowRunId,
                  },
                ]
              : [],
          status: generationStatus,
        },
        retrievalStep: {
          durationMs: stepTimings.retrieval,
          error: failedStep === 'retrieval' ? failureError : undefined,
          executions: alertRetrievalResult?.workflowExecutions ?? [],
          status: retrievalStatus,
        },
        totalDurationMs,
        validationStep: {
          durationMs: stepTimings.validation,
          executions:
            outcome?.outcome === 'validation_succeeded'
              ? [
                  {
                    workflowId: outcome.validationResult.workflowId,
                    workflowRunId: outcome.validationResult.workflowRunId,
                  },
                ]
              : [],
          status: validationStatus,
        },
      })
    );
  }
};
