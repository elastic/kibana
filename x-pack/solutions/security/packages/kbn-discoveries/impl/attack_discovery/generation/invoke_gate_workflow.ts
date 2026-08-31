/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, KibanaRequest, Logger } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';

import { AttackDiscoveryError } from '../../lib/errors/attack_discovery_error';
import type { AttackDiscoverySource } from '../persistence/event_logging';
import type {
  AlertRetrievalResult,
  WorkflowsManagementApi,
} from './invoke_alert_retrieval_workflow';
import type {
  ParsedApiConfig,
  WorkflowExecutionTracking,
  WorkflowExecutionsTracking,
} from './types';

import {
  AI_AGENT_STEP_TYPE,
  extractGateDecision,
  type GateDecision,
} from './extract_gate_decision';
import { parseEmbeddedAlertId } from './parse_embedded_alert_id';
import { pollForWorkflowCompletion } from './poll_for_workflow_completion';
import {
  validateAlertRetrievalWorkflow,
  type ValidatedWorkflow,
} from './validate_alert_retrieval_workflow';
import { writeAlertRetrievalFailedEvent } from './write_alert_retrieval_failed_event';
import { writeAlertRetrievalStartedEvent } from './write_alert_retrieval_started_event';
import { writeAlertRetrievalSucceededEvent } from './write_alert_retrieval_succeeded_event';

/**
 * Parameters for invoking the always-on ground-truthing gate workflow.
 */
export interface InvokeGateWorkflowParams {
  /**
   * Index pattern the gate uses only when it performs its own additional
   * retrieval (`skillEnabled`).
   */
  alertsIndexPattern: string;
  apiConfig: ParsedApiConfig;
  authenticatedUser: AuthenticatedUser;
  /**
   * The validated, deduped candidate alert strings produced by the retrieval
   * phase, for the gate to ground-truth. Each embeds its backing document
   * `_id`; the gate returns the `_id`s to REMOVE and never echoes these bytes
   * back (the orchestration keeps every candidate NOT listed).
   */
  candidateAlerts: string[];
  end?: string;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  logger: Logger;
  /**
   * Maximum time to wait for the gate workflow to complete, in milliseconds.
   * Threaded from the orchestration's remaining pipeline budget so the
   * consumer-side poll never gives up before the gate `ai.agent` step's own
   * timeout. When omitted, `pollForWorkflowCompletion` applies its default.
   */
  maxWaitMs?: number;
  request: KibanaRequest;
  /** Maximum alerts the gate retrieves itself when `skillEnabled` is true. */
  size?: number;
  /** Toggle 1: whether the gate may retrieve net-new alerts of its own. */
  skillEnabled: boolean;
  source?: AttackDiscoverySource;
  spaceId: string;
  start?: string;
  workflowId: string;
  workflowsManagementApi: WorkflowsManagementApi;
}

/**
 * The gate decision plus the gate workflow execution tracking entry, returned
 * to the orchestration so it can forward the kept candidate bytes, retrieve the
 * skill's net-new additions, and surface the gate execution in the monitoring
 * UI.
 */
export interface GateWorkflowResult {
  decision: GateDecision;
  workflowExecution: WorkflowExecutionTracking;
}

/**
 * Invokes the always-on ground-truthing gate workflow (the
 * `attack-discovery-generator` skill in its decision-only ground-truth mode,
 * Mode C) and returns its DECISION.
 *
 * The gate runs a native `ai.agent` step with `create-conversation: true`. This
 * function passes the candidate alerts plus the `skill_enabled` / `connector_id`
 * inputs (Constraint A), polls for completion, and extracts the decision
 * (removal set of `_id`s to drop, the skill's net-new added alerts,
 * corroboration context, and the persisted conversation id).
 *
 * Per the fail-closed gate contract, `extractGateDecision` throws an
 * `AttackDiscoveryError` when the gate fails / is cancelled / times out / has no
 * decision output, so the orchestration fails the run loudly (no silent
 * pass-through). A failed event is written for monitoring before re-throwing.
 */
export const invokeGateWorkflow = async ({
  alertsIndexPattern,
  apiConfig,
  authenticatedUser,
  candidateAlerts,
  end,
  eventLogger,
  eventLogIndex,
  executionUuid,
  logger,
  maxWaitMs,
  request,
  size,
  skillEnabled,
  source,
  spaceId,
  start,
  workflowId,
  workflowsManagementApi,
}: InvokeGateWorkflowParams): Promise<GateWorkflowResult> => {
  const startTime = new Date();
  // Initialized with a fallback before the try block so the catch block can
  // reference the most-recent value (updated once runWorkflow succeeds).
  let workflowRunId = `gate-${executionUuid}`;
  // Captured outside the try block so the catch block can include the
  // human-readable workflow name in the failure tracker entry.
  let workflowName: string | undefined;

  logger.info(
    `Invoking gate workflow: ${workflowId} (${candidateAlerts.length} candidate alert(s), skill_enabled=${skillEnabled})`
  );

  try {
    const rawWorkflow = await workflowsManagementApi.getWorkflow(workflowId, spaceId);
    const validatedWorkflow: ValidatedWorkflow = validateAlertRetrievalWorkflow(
      rawWorkflow,
      workflowId
    );
    workflowName = validatedWorkflow.name;

    const workflowInputs: Record<string, unknown> = {
      alerts_index_pattern: alertsIndexPattern,
      candidate_alerts: candidateAlerts,
      ...(apiConfig.connector_id != null ? { connector_id: apiConfig.connector_id } : {}),
      ...(end != null ? { end } : {}),
      ...(size != null ? { size } : {}),
      skill_enabled: skillEnabled,
      ...(start != null ? { start } : {}),
    };

    const workflowToRun: WorkflowExecutionEngineModel = {
      definition: validatedWorkflow.definition,
      enabled: validatedWorkflow.enabled,
      id: validatedWorkflow.id,
      name: validatedWorkflow.name,
      yaml: validatedWorkflow.yaml,
    };

    workflowRunId = await workflowsManagementApi.runWorkflow(
      workflowToRun,
      spaceId,
      workflowInputs,
      request
    );

    const workflowExecution: WorkflowExecutionTracking = {
      workflowId,
      workflowName: validatedWorkflow.name,
      workflowRunId,
    };

    // The gate runs during the generation phase, so its execution is recorded
    // under the `gate` bucket (NOT `alertRetrieval`). The monitoring UI groups
    // gate-bucket runs under the Generation phase; recording it under
    // `alertRetrieval` would (incorrectly) surface it under Alert retrieval.
    const workflowExecutions: WorkflowExecutionsTracking = {
      alertRetrieval: null,
      gate: [workflowExecution],
      generation: null,
      validation: null,
    };

    logger.info(`Gate workflow started (workflowRunId: ${workflowRunId})`);

    await writeAlertRetrievalStartedEvent({
      authenticatedUser,
      connectorId: apiConfig.connector_id,
      eventLogger,
      eventLogIndex,
      executionUuid,
      logger,
      source,
      spaceId,
      startTime,
      workflowExecutions,
      workflowId,
      workflowRunId,
    });

    const execution = await pollForWorkflowCompletion({
      executionId: workflowRunId,
      isReady: (exec) => exec.stepExecutions.some((step) => step.stepType === AI_AGENT_STEP_TYPE),
      logger,
      ...(maxWaitMs != null ? { maxWaitMs } : {}),
      spaceId,
      workflowsManagementApi,
    });

    const decision = extractGateDecision({ execution, logger });

    // Keep is derived deterministically as `candidates − removeAlertIds`. Only
    // count removals that actually match a candidate `_id` (a hallucinated
    // remove id matches nothing and must not shrink the count below zero).
    const candidateIds = new Set(
      candidateAlerts
        .map((alert) => parseEmbeddedAlertId(alert))
        .filter((id): id is string => id != null)
    );
    const removedMatchedCount = decision.removeAlertIds.filter((id) => candidateIds.has(id)).length;
    const keptCount = candidateAlerts.length - removedMatchedCount;

    logger.info(
      `Gate workflow completed: remove=${decision.removeAlertIds.length} added=${decision.addedAlertIds.length}`
    );

    const endTime = new Date();

    await writeAlertRetrievalSucceededEvent({
      alertsContextCount: keptCount + decision.addedAlertIds.length,
      authenticatedUser,
      connectorId: apiConfig.connector_id,
      ...(decision.conversationId != null ? { conversationId: decision.conversationId } : {}),
      endTime,
      eventLogger,
      eventLogIndex,
      executionUuid,
      logger,
      source,
      spaceId,
      startTime,
      workflowExecutions,
      workflowId,
      workflowRunId,
    });

    return {
      decision,
      workflowExecution,
    };
  } catch (error) {
    const endTime = new Date();
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(`Gate workflow failed: ${errorMessage}`);

    const workflowExecution: WorkflowExecutionTracking = {
      workflowId,
      ...(workflowName != null ? { workflowName } : {}),
      workflowRunId,
    };

    const workflowExecutions: WorkflowExecutionsTracking = {
      alertRetrieval: null,
      gate: [workflowExecution],
      generation: null,
      validation: null,
    };

    await writeAlertRetrievalFailedEvent({
      authenticatedUser,
      connectorId: apiConfig.connector_id,
      endTime,
      ...(error instanceof AttackDiscoveryError ? { errorCategory: error.errorCategory } : {}),
      errorMessage,
      eventLogger,
      eventLogIndex,
      executionUuid,
      ...(error instanceof AttackDiscoveryError && error.workflowId != null
        ? { failedWorkflowId: error.workflowId }
        : {}),
      logger,
      source,
      spaceId,
      startTime,
      workflowId,
      workflowExecutions,
      workflowRunId,
    });

    throw error;
  }
};

/**
 * Re-exported so callers that compose the gate decision into an
 * `AlertRetrievalResult` for generation have the type in one import.
 */
export type { AlertRetrievalResult, GateDecision };
