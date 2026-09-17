/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnalyticsServiceSetup,
  AuthenticatedUser,
  ElasticsearchClient,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import { ERROR_CATEGORIES } from '@kbn/discoveries-schemas';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import {
  ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW_ID,
  ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW_ID,
} from '@kbn/workflows/managed';
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
import { invokeSkillReportWorkflow } from '../invoke_skill_report_workflow';
import { runGatePhase } from '../run_gate_phase';
import { shouldRunGate } from '../should_run_gate';
import { buildExecutionSummaryLog } from './helpers/build_execution_summary_log';
import { getStepStatuses } from './helpers/get_step_statuses';
import { handleNoAlerts } from './helpers/handle_no_alerts';
import { mapFailedStepToTelemetry } from './helpers/map_failed_step_to_telemetry';
import { PipelineStepError } from './helpers/pipeline_step_error';
import { resolveFailedStep } from './helpers/resolve_failed_step';
import { runGenerationStep } from './steps/generation_step';
import { runRetrievalStep } from './steps/retrieval_step';
import { type ManualOrchestrationOutcome, runValidationStep } from './steps/validation_step';

export type { ManualOrchestrationOutcome } from './steps/validation_step';
export { PipelineStepError } from './helpers/pipeline_step_error';

/**
 * Default maximum pipeline duration in milliseconds (30 minutes) — ADR-008.
 *
 * The generation phase now runs the always-on ground-truthing gate (an
 * `ai.agent` step with a 10m timeout) BEFORE the generate workflow (also up to
 * 10m), and validation follows (up to 5m). The budget must cover gate +
 * generate + validate on every gated run, with each phase bounded separately by
 * `getRemainingBudgetMs()`. A 15m budget left no room for generate once the gate
 * approached its own timeout, so the budget was raised to 30m. The gate has no
 * `on-failure: retry` (fail-closed): a retry would restart the long-running
 * conversation-stateful step from scratch and burn the remaining budget.
 */
const DEFAULT_PIPELINE_TIMEOUT_MS = 30 * 60 * 1000;

export const runManualOrchestration = async ({
  alerts,
  alertsIndexPattern,
  analytics,
  anonymizationFields,
  apiConfig,
  authenticatedUser,
  basePath,
  computeSha256Hash,
  defaultWorkflowIds,
  end,
  esClient,
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
  trigger,
  workflowConfig,
  workflowsManagementApi,
}: {
  /**
   * Pre-provided alert strings. When this array is non-empty (the `agent_builder`
   * run tool and run-step composability path), the retrieval phase is skipped and
   * a synthetic AlertRetrievalResult is constructed from these alerts instead.
   */
  alerts?: string[];
  alertsIndexPattern: string;
  analytics?: AnalyticsServiceSetup;
  anonymizationFields: AnonymizationFieldResponse[];
  apiConfig: ParsedApiConfig;
  authenticatedUser: AuthenticatedUser;
  basePath: string;
  /**
   * Isomorphic sha256 hasher injected by the scheduled executor, threaded down to
   * the validation step for FF-on scheduled cross-execution de-duplication.
   */
  computeSha256Hash?: (input: string) => string;
  defaultWorkflowIds: DefaultWorkflowIds;
  end?: string;
  /**
   * Trusted in-process Elasticsearch client, threaded down to the validation
   * step for FF-on scheduled cross-execution de-duplication.
   */
  esClient?: ElasticsearchClient;
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
  /**
   * How generation was triggered (`manual` | `schedule` | `workflow` |
   * `agent_builder`). The always-on gate runs for every trigger EXCEPT
   * `agent_builder` (the conversational skill has already ground-truthed its own
   * data before delegating to the pipeline — see `shouldRunGate`).
   */
  trigger?: string;
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
      `Starting manual orchestration: skill_enabled=${
        workflowConfig.skill_enabled
      }, default_retrieval_enabled=${workflowConfig.default_retrieval_enabled} (mode=${
        workflowConfig.alert_retrieval_mode
      }), alert_retrieval_workflows_enabled=${
        workflowConfig.alert_retrieval_workflows_enabled
      }, custom_workflow_ids=${JSON.stringify(
        workflowConfig.alert_retrieval_workflow_ids
      )}, trigger=${trigger ?? 'unknown'}, pipelineTimeoutMs=${pipelineTimeoutMs}`
  );

  const orchestrationStart = Date.now();

  // `validation_workflow_id` is a required string whose empty-string value is the
  // "use default validation workflow" sentinel (see `reportGenerationSuccessTelemetry`).
  // Use `||` (not `??`) so the empty-string sentinel also falls back to the resolved
  // default, otherwise step-failure telemetry would report an empty `workflow_id`.
  const validationWorkflowId = workflowConfig.validation_workflow_id || defaultValidationWorkflowId;

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
    gateStart: 0,
    generationStart: 0,
    retrievalStart: 0,
    steps: { gate: 0, generation: 0, retrieval: 0, validation: 0 },
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

    // Candidate alert set produced by the deterministic retrieval phase (or
    // pre-provided alerts). Assigned to `state.alertRetrievalResult` only AFTER
    // the gate completes, so a fail-closed gate failure is attributed to the
    // retrieval→gate boundary (`resolveFailedStep` keys off an unset result).
    let candidateResult: AlertRetrievalResult;

    if (alerts != null && alerts.length > 0) {
      // Skip the retrieval phase: construct a synthetic candidate set from the
      // pre-provided alerts (the run tool / run-step composability path).
      logger.info(`Skipping alert retrieval, using ${alerts.length} pre-provided alert(s)`);
      candidateResult = {
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
      candidateResult = await runRetrievalStep({
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
        maxWaitMs: getRemainingBudgetMs(),
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

    // Candidate count handed to the gate, captured before the gate may replace
    // `candidateResult`. Used by the fail-closed guard below to distinguish a
    // gate whose own additional retrieval was the SOLE source of alerts.
    const candidateCountBeforeGate = candidateResult.alerts.length;

    // Always-on ground-truthing gate (generation phase, before the untouched
    // generate workflow). Runs for every trigger EXCEPT `agent_builder` (the
    // conversational skill already ground-truthed its own data). The gate is the
    // final arbiter of the candidate set: it keeps a subset by `_id` (original
    // bytes pass through), may add net-new alerts (Skill toggle), and threads a
    // `conversation_id` for the report phase. Fail-closed: a gate failure throws.
    if (shouldRunGate(trigger)) {
      timings.gateStart = Date.now();
      candidateResult = await runGatePhase({
        alertsIndexPattern,
        anonymizationFields,
        apiConfig,
        authenticatedUser,
        candidateResult,
        defaultAlertRetrievalWorkflowId,
        end,
        eventLogger,
        eventLogIndex,
        executionUuid,
        gateWorkflowId: ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW_ID,
        logger,
        maxWaitMs: getRemainingBudgetMs(),
        request,
        size,
        skillEnabled: workflowConfig.skill_enabled,
        source,
        spaceId,
        start,
        workflowsManagementApi,
      });
      timings.steps.gate = Date.now() - timings.gateStart;

      // Fail-closed guard: when the skill's additional retrieval was the SOLE
      // source of alerts (skill enabled, zero deterministic candidates) and the
      // gate still produced zero alerts, the gate retrieved-then-dropped
      // everything (e.g. over-filtering on inconclusive corroboration) — the
      // exact silent-miss mode that yields a "no matching alerts" result that is
      // indistinguishable from "no data in range". Surface it loudly instead.
      // Thrown BEFORE `state.alertRetrievalResult` is assigned so `resolveFailedStep`
      // attributes the failure to the retrieval→gate boundary.
      if (
        workflowConfig.skill_enabled &&
        candidateCountBeforeGate === 0 &&
        candidateResult.alerts.length === 0
      ) {
        throw new AttackDiscoveryError({
          errorCategory: ERROR_CATEGORIES.validation_error,
          message: `No alerts were available to analyze for the selected time range: no candidate alerts were retrieved and the skill's additional retrieval returned none (execution_uuid=${executionUuid}).`,
          workflowId: ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW_ID,
        });
      }
    }

    state.alertRetrievalResult = candidateResult;

    // Zero-alert guard: when retrieval returns no alerts there is nothing to
    // generate on, so skip both generation (the LLM call) and validation and
    // surface a clear `no_alerts` terminal outcome instead.
    if (state.alertRetrievalResult.alerts.length === 0) {
      state.outcome = await handleNoAlerts({
        alertRetrievalResult: state.alertRetrievalResult,
        apiConfig,
        authenticatedUser,
        eventLogger,
        eventLogIndex,
        executionUuid,
        generationWorkflowId,
        logger,
        source,
        sourceMetadata,
        spaceId,
        startTime: new Date(orchestrationStart),
      });

      return state.outcome;
    }

    // Set the start marker BEFORE the budget check so a budget-exceeded throw is
    // measured against this phase's start (near-zero duration) rather than the
    // unset `0`, which would report ~1.7e12ms (Date.now()) telemetry durations.
    timings.generationStart = Date.now();

    assertBudgetRemaining('generation');

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

    // Set the start marker BEFORE the budget check (see the generation phase note).
    timings.validationStart = Date.now();

    assertBudgetRemaining('validation');

    state.outcome = await runValidationStep({
      alertRetrievalResult: state.alertRetrievalResult,
      authenticatedUser,
      computeSha256Hash,
      defaultValidationWorkflowId,
      esClient,
      eventLogger,
      eventLogIndex,
      executionUuid,
      generationResult: state.generationResult,
      logger,
      maxWaitMs: getRemainingBudgetMs(),
      request,
      source,
      sourceMetadata,
      spaceId,
      workflowConfig,
      workflowsManagementApi,
    });
    timings.steps.validation = Date.now() - timings.validationStart;

    // Phase-2 (Mode B) resumable reporting, for ALL gated runs. When the gate
    // persisted an Agent Builder conversation, resume it (fire-and-forget) so the
    // skill renders the Attack Discovery Report into that same conversation.
    // Scheduling is quick; the report itself runs in the background via the task
    // manager. Wrapped so a report failure can never affect the generation outcome.
    const conversationId = state.alertRetrievalResult?.conversationId;
    if (conversationId != null) {
      try {
        await invokeSkillReportWorkflow({
          connectorId: apiConfig.connector_id,
          conversationId,
          executionUuid,
          logger,
          request,
          spaceId,
          workflowId: ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW_ID,
          workflowsManagementApi,
        });
      } catch (reportError) {
        logger.error(
          `Failed to resume skill conversation for report (execution_uuid=${executionUuid}): ${
            reportError instanceof Error ? reportError.message : String(reportError)
          }`
        );
      }
    }

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
