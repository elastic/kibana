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
import { buildExecutionSummaryLog } from './helpers/build_execution_summary_log';
import { getStepStatuses } from './helpers/get_step_statuses';
import { mapFailedStepToTelemetry } from './helpers/map_failed_step_to_telemetry';
import { PipelineStepError } from './helpers/pipeline_step_error';
import { resolveFailedStep } from './helpers/resolve_failed_step';
import { runGenerationStep } from './steps/generation_step';
import { runRetrievalStep } from './steps/retrieval_step';
import { type ManualOrchestrationOutcome, runValidationStep } from './steps/validation_step';

export type { ManualOrchestrationOutcome } from './steps/validation_step';
export { PipelineStepError } from './helpers/pipeline_step_error';

/** Default maximum pipeline duration in milliseconds (10 minutes) */
const DEFAULT_PIPELINE_TIMEOUT_MS = 10 * 60 * 1000;

export const runManualOrchestration = async ({
  alerts,
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
  /**
   * Pre-provided alert strings for `provided` mode. When `workflowConfig.alert_retrieval_mode`
   * is `'provided'` and this array is non-empty, the retrieval step is skipped and a synthetic
   * AlertRetrievalResult is constructed from these alerts instead.
   */
  alerts?: string[];
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
      `Starting manual orchestration: alert_retrieval_mode=${
        workflowConfig.alert_retrieval_mode
      }, custom_workflow_ids=${JSON.stringify(
        workflowConfig.alert_retrieval_workflow_ids
      )}, pipelineTimeoutMs=${pipelineTimeoutMs}`
  );

  const orchestrationStart = Date.now();

  const validationWorkflowId = workflowConfig.validation_workflow_id ?? defaultValidationWorkflowId;

  // Mutable execution state — a single const object used by try/catch/finally
  // to share the partial results and failure context across all three blocks.
  const state: {
    alertRetrievalResult: AlertRetrievalResult | undefined;
    failedStep: 'generation' | 'retrieval' | 'validation' | undefined;
    failureError: string | undefined;
    generationResult: GenerationWorkflowResult | undefined;
    outcome: ManualOrchestrationOutcome | undefined;
  } = {
    alertRetrievalResult: undefined,
    failedStep: undefined,
    failureError: undefined,
    generationResult: undefined,
    outcome: undefined,
  };

  // Step-level timing markers.  Each start marker is set immediately before
  // the corresponding async call so that catch/finally can measure duration
  // even when a step fails partway through.
  const timings = {
    generationStart: 0,
    retrievalStart: 0,
    steps: { generation: 0, retrieval: 0, validation: 0 },
    validationStart: 0,
  };

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
    timings.retrievalStart = Date.now();

    if (workflowConfig.alert_retrieval_mode === 'provided' && alerts != null && alerts.length > 0) {
      // Skip the retrieval step: construct a synthetic AlertRetrievalResult from pre-provided alerts
      logger.info(
        `Provided mode: skipping alert retrieval, using ${alerts.length} pre-provided alerts`
      );
      state.alertRetrievalResult = {
        alerts,
        alertsContextCount: alerts.length,
        anonymizedAlerts: [],
        apiConfig,
        connectorName: '',
        replacements: {},
        workflowExecutions: [],
        workflowId: 'provided',
        workflowRunId: 'provided',
      };
    } else {
      state.alertRetrievalResult = await runRetrievalStep({
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
        source,
        spaceId,
        start,
        workflowConfig,
        workflowsManagementApi,
      });
    }

    timings.steps.retrieval = Date.now() - timings.retrievalStart;

    assertBudgetRemaining('generation');

    timings.generationStart = Date.now();
    state.generationResult = await runGenerationStep({
      alertRetrievalResult: state.alertRetrievalResult,
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
    timings.steps.generation = Date.now() - timings.generationStart;

    assertBudgetRemaining('validation');

    timings.validationStart = Date.now();
    state.outcome = await runValidationStep({
      alertRetrievalResult: state.alertRetrievalResult,
      authenticatedUser,
      defaultValidationWorkflowId,
      eventLogger,
      eventLogIndex,
      executionUuid,
      generationResult: state.generationResult,
      logger,
      maxWaitMs: getRemainingBudgetMs(),
      request,
      source,
      spaceId,
      workflowConfig,
      workflowsManagementApi,
    });
    timings.steps.validation = Date.now() - timings.validationStart;

    return state.outcome;
  } catch (error) {
    state.failureError = error instanceof Error ? error.message : String(error);

    const { durationMs, failedStep } = resolveFailedStep({
      alertRetrievalResult: state.alertRetrievalResult,
      generationResult: state.generationResult,
      generationStartMs: timings.generationStart,
      retrievalStartMs: timings.retrievalStart,
      validationStartMs: timings.validationStart,
    });

    state.failedStep = failedStep;
    timings.steps[failedStep] = durationMs;

    const {
      durationMs: telemetryDurationMs,
      step: telemetryStep,
      workflowId: telemetryWorkflowId,
    } = mapFailedStepToTelemetry({
      defaultAlertRetrievalWorkflowId,
      failedStep,
      generationWorkflowId,
      stepTimings: timings.steps,
      validationWorkflowId,
    });

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
      message: state.failureError,
      step: telemetryStep,
    });
  } finally {
    const totalDurationMs = Date.now() - orchestrationStart;

    const { generationStatus, retrievalStatus, validationStatus } = getStepStatuses({
      alertRetrievalResult: state.alertRetrievalResult,
      failedStep: state.failedStep,
      generationResult: state.generationResult,
      outcome: state.outcome,
    });

    const persistedCount =
      state.outcome?.outcome === 'validation_succeeded'
        ? state.outcome.validationResult.validationSummary.persistedCount
        : 0;

    const generationExecutions =
      state.generationResult != null
        ? [
            {
              workflowId: state.generationResult.workflowId,
              workflowRunId: state.generationResult.workflowRunId,
            },
          ]
        : [];

    const validationExecutions =
      state.outcome?.outcome === 'validation_succeeded'
        ? [
            {
              workflowId: state.outcome.validationResult.workflowId,
              workflowRunId: state.outcome.validationResult.workflowRunId,
            },
          ]
        : [];

    logger.info(
      buildExecutionSummaryLog({
        alertsContextCount: state.alertRetrievalResult?.alertsContextCount ?? 0,
        basePath,
        generationStep: {
          durationMs: timings.steps.generation,
          error: state.failedStep === 'generation' ? state.failureError : undefined,
          executions: generationExecutions,
          status: generationStatus,
        },
        persistedCount,
        retrievalStep: {
          durationMs: timings.steps.retrieval,
          error: state.failedStep === 'retrieval' ? state.failureError : undefined,
          executions: state.alertRetrievalResult?.workflowExecutions ?? [],
          status: retrievalStatus,
        },
        totalDurationMs,
        validationStep: {
          durationMs: timings.steps.validation,
          error: state.failedStep === 'validation' ? state.failureError : undefined,
          executions: validationExecutions,
          status: validationStatus,
        },
      })
    );
  }
};
