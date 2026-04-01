/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, KibanaRequest, Logger } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type {
  WorkflowDetailDto,
  WorkflowExecutionDto,
  WorkflowExecutionEngineModel,
} from '@kbn/workflows';

import type {
  ParsedApiConfig,
  WorkflowExecutionTracking,
  WorkflowExecutionsTracking,
} from './types';

import { buildAlertRetrievalWorkflowInputs } from './build_alert_retrieval_workflow_inputs';
import { extractAlertRetrievalResult } from './extract_alert_retrieval_result';
import { pollForWorkflowCompletion } from './poll_for_workflow_completion';
import {
  validateAlertRetrievalWorkflow,
  type ValidatedWorkflow,
} from './validate_alert_retrieval_workflow';
import { writeAlertRetrievalFailedEvent } from './write_alert_retrieval_failed_event';
import { writeAlertRetrievalStartedEvent } from './write_alert_retrieval_started_event';
import { writeAlertRetrievalSucceededEvent } from './write_alert_retrieval_succeeded_event';

/**
 * Represents a single anonymized alert document.
 */
export interface AnonymizedAlert {
  id?: string;
  metadata: Record<string, never>;
  page_content: string;
}

/**
 * Result returned from the alert retrieval workflow.
 */
export interface AlertRetrievalResult {
  alerts: string[];
  alertsContextCount: number;
  anonymizedAlerts: AnonymizedAlert[];
  apiConfig: ParsedApiConfig;
  connectorName: string;
  replacements: Record<string, string>;
  workflowExecutions: WorkflowExecutionTracking[];
  workflowId: string;
  workflowRunId: string;
}

/**
 * Parameters for invoking the alert retrieval workflow.
 */
export interface InvokeAlertRetrievalParams {
  alertsIndexPattern: string;
  anonymizationFields?: unknown[];
  apiConfig: ParsedApiConfig;
  authenticatedUser: AuthenticatedUser;
  end?: string;
  esqlQuery?: string;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  filter?: Record<string, unknown>;
  logger: Logger;
  request: KibanaRequest;
  size?: number;
  spaceId: string;
  start?: string;
  workflowId: string;
  workflowsManagementApi: WorkflowsManagementApi;
}

/**
 * Type definition for the workflows management API.
 * This is a subset of the full API needed for alert retrieval.
 */
export interface WorkflowsManagementApi {
  getWorkflow: (workflowId: string, spaceId: string) => Promise<WorkflowDetailDto | null>;
  getWorkflowExecution: (
    executionId: string,
    spaceId: string,
    options?: { includeInput?: boolean; includeOutput?: boolean }
  ) => Promise<WorkflowExecutionDto | null>;
  runWorkflow: (
    workflow: WorkflowExecutionEngineModel,
    spaceId: string,
    inputs: Record<string, unknown>,
    request: KibanaRequest
  ) => Promise<string>;
}

/**
 * Invokes the default alert retrieval workflow and returns the results.
 *
 * The function:
 * 1. Validates the workflow exists and is executable
 * 2. Runs the workflow with the provided inputs
 * 3. Polls for workflow completion
 * 4. Extracts and returns the alert retrieval results
 * 5. Writes event log events for monitoring
 */
export const invokeAlertRetrievalWorkflow = async ({
  alertsIndexPattern,
  anonymizationFields,
  apiConfig,
  authenticatedUser,
  end,
  esqlQuery,
  eventLogger,
  eventLogIndex,
  executionUuid,
  filter,
  logger,
  request,
  size,
  spaceId,
  start,
  workflowId,
  workflowsManagementApi,
}: InvokeAlertRetrievalParams): Promise<AlertRetrievalResult> => {
  const startTime = new Date();
  // Initialized with a fallback before the try block so the catch block can reference
  // the most-recent value (updated to the actual run ID once runWorkflow succeeds).
  let workflowRunId = `alert-retrieval-${executionUuid}`;

  logger.info(`Invoking alert retrieval workflow: ${workflowId}`);

  try {
    // Step 1: Get and validate the workflow
    const rawWorkflow = await workflowsManagementApi.getWorkflow(workflowId, spaceId);
    const validatedWorkflow: ValidatedWorkflow = validateAlertRetrievalWorkflow(
      rawWorkflow,
      workflowId
    );

    // Step 2: Build workflow inputs
    const workflowInputs = buildAlertRetrievalWorkflowInputs({
      alertsIndexPattern,
      anonymizationFields,
      apiConfig,
      end,
      esqlQuery,
      filter,
      size,
      start,
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

    const workflowExecution: WorkflowExecutionTracking = {
      workflowId,
      workflowName: validatedWorkflow.name,
      workflowRunId,
    };

    const workflowExecutions: WorkflowExecutionsTracking = {
      alertRetrieval: [workflowExecution],
      generation: null,
      validation: null,
    };

    logger.info(`Alert retrieval workflow started (workflowRunId: ${workflowRunId})`);

    // Step 4: Write started event
    await writeAlertRetrievalStartedEvent({
      authenticatedUser,
      connectorId: apiConfig.connector_id,
      eventLogger,
      eventLogIndex,
      executionUuid,
      logger,
      spaceId,
      startTime,
      workflowExecutions,
      workflowId,
      workflowRunId,
    });

    // Step 5: Poll for completion
    const execution = await pollForWorkflowCompletion({
      executionId: workflowRunId,
      isReady: (exec) =>
        exec.stepExecutions.some(
          (step) => step.stepType === 'attack-discovery.defaultAlertRetrieval'
        ),
      logger,
      spaceId,
      workflowsManagementApi,
    });

    // Step 6: Extract results
    const extractedResult = extractAlertRetrievalResult({ apiConfig, execution });
    const endTime = new Date();

    logger.info(
      `Alert retrieval workflow completed: ${extractedResult.alertsContextCount} alerts retrieved`
    );

    // Step 7: Write success event
    await writeAlertRetrievalSucceededEvent({
      alertsContextCount: extractedResult.alertsContextCount,
      authenticatedUser,
      connectorId: apiConfig.connector_id,
      endTime,
      eventLogger,
      eventLogIndex,
      executionUuid,
      logger,
      spaceId,
      startTime,
      workflowExecutions,
      workflowId,
      workflowRunId,
    });

    return {
      alerts: extractedResult.alerts,
      alertsContextCount: extractedResult.alertsContextCount,
      anonymizedAlerts: extractedResult.anonymizedAlerts,
      apiConfig: extractedResult.apiConfig,
      connectorName: extractedResult.connectorName,
      replacements: extractedResult.replacements,
      workflowExecutions: [workflowExecution],
      workflowId,
      workflowRunId,
    };
  } catch (error) {
    const endTime = new Date();
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(`Alert retrieval workflow failed: ${errorMessage}`);

    const workflowExecution: WorkflowExecutionTracking = {
      workflowId,
      workflowRunId,
    };

    const workflowExecutions: WorkflowExecutionsTracking = {
      alertRetrieval: [workflowExecution],
      generation: null,
      validation: null,
    };

    // Write failure event
    await writeAlertRetrievalFailedEvent({
      authenticatedUser,
      connectorId: apiConfig.connector_id,
      endTime,
      errorMessage,
      eventLogger,
      eventLogIndex,
      executionUuid,
      logger,
      spaceId,
      startTime,
      workflowId,
      workflowExecutions,
      workflowRunId,
    });

    throw error;
  }
};
