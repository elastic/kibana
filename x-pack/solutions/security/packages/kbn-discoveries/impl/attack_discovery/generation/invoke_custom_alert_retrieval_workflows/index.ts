/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, KibanaRequest, Logger } from '@kbn/core/server';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';

import type { WorkflowsManagementApi } from '../invoke_alert_retrieval_workflow';
import type { AttackDiscoverySource } from '../../persistence/event_logging';
import { AttackDiscoveryError } from '../../../lib/errors/attack_discovery_error';
import {
  type ValidatedWorkflow,
  validateAlertRetrievalWorkflow,
} from '../validate_alert_retrieval_workflow';
import { pollForWorkflowCompletion } from '../poll_for_workflow_completion';
import {
  extractCustomWorkflowResult,
  type CustomWorkflowAlertResult,
} from '../extract_custom_workflow_result';
import type { ParsedApiConfig, WorkflowExecutionsTracking } from '../types';
import { writeAlertRetrievalStartedEvent } from '../write_alert_retrieval_started_event';
import { writeAlertRetrievalSucceededEvent } from '../write_alert_retrieval_succeeded_event';
import { writeAlertRetrievalFailedEvent } from '../write_alert_retrieval_failed_event';

/**
 * Parameters for invoking custom alert retrieval workflows.
 */
export interface InvokeCustomAlertRetrievalParams {
  alertsIndexPattern: string;
  anonymizationFields: AnonymizationFieldResponse[];
  apiConfig: ParsedApiConfig;
  authenticatedUser: AuthenticatedUser;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  filter?: Record<string, unknown>;
  logger: Logger;
  request: KibanaRequest;
  size?: number;
  source?: AttackDiscoverySource;
  spaceId: string;
  workflowIds: string[];
  workflowsManagementApi: WorkflowsManagementApi;
}

/**
 * Builds inputs for a custom alert retrieval workflow.
 *
 * Passes common alert retrieval parameters **except** `start` and `end`.
 * Custom workflows define their own time-range defaults in their input
 * definitions (e.g., `default: now-7d`).  Forwarding the global Attack
 * Discovery time range would silently override those defaults, causing
 * workflows like "Closed Alerts Last 7 Days" to only search the
 * pipeline's shorter window (e.g., 24 h).
 *
 * The workflow engine does not reject extra inputs during default
 * application, so inputs like `alerts_index_pattern`, `filter`, `size`,
 * `anonymization_fields`, and `api_config` are passed for workflows
 * that choose to use them.
 */
const buildCustomWorkflowInputs = ({
  alertsIndexPattern,
  anonymizationFields,
  apiConfig,
  filter,
  size,
}: {
  alertsIndexPattern: string;
  anonymizationFields: AnonymizationFieldResponse[];
  apiConfig: ParsedApiConfig;
  filter?: Record<string, unknown>;
  size?: number;
}): Record<string, unknown> => ({
  alerts_index_pattern: alertsIndexPattern,
  anonymization_fields: anonymizationFields,
  api_config: apiConfig,
  filter: filter ?? undefined,
  size: size ?? 100,
});

/**
 * Invokes a single custom alert retrieval workflow and returns the result.
 */
const invokeSingleCustomWorkflow = async ({
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
  workflowId,
  workflowsManagementApi,
}: {
  alertsIndexPattern: string;
  anonymizationFields: AnonymizationFieldResponse[];
  apiConfig: ParsedApiConfig;
  authenticatedUser: AuthenticatedUser;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  filter?: Record<string, unknown>;
  logger: Logger;
  request: KibanaRequest;
  size?: number;
  source?: AttackDiscoverySource;
  spaceId: string;
  workflowId: string;
  workflowsManagementApi: WorkflowsManagementApi;
}): Promise<CustomWorkflowAlertResult> => {
  const startTime = new Date();
  // Initialized with a fallback before the try block so the catch block can reference
  // the most-recent value (updated to the actual run ID once runWorkflow succeeds).
  let workflowRunId = `custom-alert-retrieval-${workflowId}-${executionUuid}`;
  // Captured outside the try block so it is accessible in the catch for event writing.
  // This allows the failed-event tracking to include the human-readable workflow name,
  // enabling the pipeline monitor UI to display the disabled workflow's name instead of its ID.
  let workflowName: string | undefined;

  logger.info(`Invoking custom alert retrieval workflow: ${workflowId}`);

  try {
    // Step 1: Get and validate the workflow
    const rawWorkflow = await workflowsManagementApi.getWorkflow(workflowId, spaceId);
    workflowName = rawWorkflow?.name;
    logger.debug(
      () =>
        `Custom workflow ${workflowId}: ${
          rawWorkflow != null
            ? `name=${rawWorkflow.name}, enabled=${rawWorkflow.enabled}, valid=${rawWorkflow.valid}`
            : 'null'
        }`
    );

    const validatedWorkflow: ValidatedWorkflow = validateAlertRetrievalWorkflow(
      rawWorkflow,
      workflowId
    );

    // Step 2: Build inputs (start/end omitted so workflows use their own defaults)
    const workflowInputs = buildCustomWorkflowInputs({
      alertsIndexPattern,
      anonymizationFields,
      apiConfig,
      filter,
      size,
    });

    // Step 3: Run the workflow
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

    const workflowExecutions: WorkflowExecutionsTracking = {
      alertRetrieval: [{ workflowId, workflowName, workflowRunId }],
      generation: null,
      validation: null,
    };

    logger.info(
      `Custom alert retrieval workflow started: ${workflowId} (workflowRunId: ${workflowRunId})`
    );

    // Step 4: Write started event
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

    // Step 5: Poll for completion
    const execution = await pollForWorkflowCompletion({
      executionId: workflowRunId,
      logger,
      spaceId,
      workflowsManagementApi,
    });

    logger.debug(
      () =>
        `Custom workflow ${workflowId} execution completed: status=${execution.status}, steps=${execution.stepExecutions.length}`
    );

    // Step 6: Extract results
    const result = extractCustomWorkflowResult({
      execution,
      workflowId,
      workflowRunId,
    });

    const endTime = new Date();

    logger.info(
      `Custom alert retrieval workflow ${workflowId} completed: ${result.alertsContextCount} alerts retrieved`
    );

    // Step 7: Write success event
    await writeAlertRetrievalSucceededEvent({
      alertsContextCount: result.alertsContextCount,
      authenticatedUser,
      connectorId: apiConfig.connector_id,
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

    return result;
  } catch (error) {
    const endTime = new Date();
    const errorMessage = error instanceof Error ? error.message : String(error);

    const errorCategory = error instanceof AttackDiscoveryError ? error.errorCategory : undefined;
    const failedWorkflowId = error instanceof AttackDiscoveryError ? error.workflowId : undefined;

    const workflowExecutions: WorkflowExecutionsTracking = {
      alertRetrieval: [{ workflowId, workflowName, workflowRunId }],
      generation: null,
      validation: null,
    };

    await writeAlertRetrievalFailedEvent({
      authenticatedUser,
      connectorId: apiConfig.connector_id,
      endTime,
      errorCategory,
      errorMessage,
      eventLogger,
      eventLogIndex,
      executionUuid,
      failedWorkflowId,
      logger,
      source,
      spaceId,
      startTime,
      workflowExecutions,
      workflowId,
      workflowRunId,
    });

    throw error;
  }
};

/**
 * Invokes all custom alert retrieval workflows **in parallel** and returns their results.
 *
 * Fail-fast: if ANY workflow fails, an error is thrown so the pipeline
 * does not proceed to generation with partial/incomplete alert data.
 */
export const invokeCustomAlertRetrievalWorkflows = async ({
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
  workflowIds,
  workflowsManagementApi,
}: InvokeCustomAlertRetrievalParams): Promise<CustomWorkflowAlertResult[]> => {
  if (workflowIds.length === 0) {
    return [];
  }

  logger.info(
    `Invoking ${
      workflowIds.length
    } custom alert retrieval workflow(s) in parallel: ${workflowIds.join(', ')}`
  );

  const settled = await Promise.allSettled(
    workflowIds.map((workflowId) =>
      invokeSingleCustomWorkflow({
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
        workflowId,
        workflowsManagementApi,
      })
    )
  );

  settled.forEach((outcome, index) => {
    if (outcome.status === 'rejected') {
      const errorMessage =
        outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);

      logger.error(`Custom alert retrieval workflow ${workflowIds[index]} failed: ${errorMessage}`);
    }
  });

  const results: CustomWorkflowAlertResult[] = settled
    .filter(
      (outcome): outcome is PromiseFulfilledResult<CustomWorkflowAlertResult> =>
        outcome.status === 'fulfilled'
    )
    .map((outcome) => outcome.value);

  const failures: Array<{ errorMessage: string; workflowId: string }> = settled
    .map((outcome, index) =>
      outcome.status === 'rejected'
        ? {
            errorMessage:
              outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
            workflowId: workflowIds[index],
          }
        : null
    )
    .filter((f): f is { errorMessage: string; workflowId: string } => f !== null);

  if (failures.length > 0) {
    const failureDetails = failures
      .map(({ errorMessage, workflowId }) => `${workflowId} (${errorMessage})`)
      .join(', ');

    throw new Error(
      `${failures.length} custom alert retrieval workflow(s) failed: ${failureDetails}`
    );
  }

  const totalAlerts = results.reduce((sum, r) => sum + r.alertsContextCount, 0);

  logger.info(
    `Custom alert retrieval completed: ${results.length}/${workflowIds.length} workflows succeeded, ${totalAlerts} total alerts retrieved`
  );

  return results;
};
