/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';

import type { AnonymizedAlert, WorkflowsManagementApi } from '../invoke_alert_retrieval_workflow';
import type { ParsedApiConfig, WorkflowExecutionTracking } from '../types';

import { buildAlertRetrievalWorkflowInputs } from '../build_alert_retrieval_workflow_inputs';
import { extractAlertRetrievalResult } from '../extract_alert_retrieval_result';
import { pollForWorkflowCompletion } from '../poll_for_workflow_completion';
import { validateAlertRetrievalWorkflow } from '../validate_alert_retrieval_workflow';

/**
 * Parameters for retrieving and anonymizing a curated set of alerts by their
 * Elasticsearch `_id` values.
 */
export interface RetrieveAnonymizedAlertsByIdsParams {
  /** The backing alert document `_id` values to retrieve. */
  alertIds: string[];
  alertsIndexPattern: string;
  anonymizationFields?: unknown[];
  apiConfig: ParsedApiConfig;
  logger: Logger;
  /**
   * Maximum time to wait for the retrieval workflow to complete, in
   * milliseconds. Threaded from the orchestration's remaining pipeline budget.
   */
  maxWaitMs?: number;
  request: KibanaRequest;
  spaceId: string;
  /** Id of the default alert retrieval workflow used to fetch + anonymize. */
  workflowId: string;
  workflowsManagementApi: WorkflowsManagementApi;
}

/**
 * The anonymized alert set produced by retrieving the curated `alertIds`.
 */
export interface RetrieveAnonymizedAlertsByIdsResult {
  alerts: string[];
  alertsContextCount: number;
  anonymizedAlerts: AnonymizedAlert[];
  connectorName: string;
  replacements: Record<string, string>;
  workflowExecution: WorkflowExecutionTracking;
  workflowRunId: string;
}

/**
 * Retrieves and anonymizes the curated alert set identified by `alertIds`.
 *
 * Runs the default alert retrieval workflow with an Elasticsearch `ids` filter
 * so exactly the curated alerts are fetched and anonymized using the same
 * machinery as the `esql` / `custom_query` retrieval modes. This is the
 * second half of the `skill` retrieval mode: the skill's `ai.agent` step curates
 * which alerts (returning only their `_id` values), and this function fetches the
 * full, anonymized alert documents for those ids — keeping the LLM payload tiny
 * and avoiding token-limit / truncation failures from round-tripping wide alert
 * documents through the agent.
 *
 * This function intentionally does **not** write alert-retrieval event-log
 * events: the caller (`invokeSkillAlertRetrievalWorkflow`) owns the single
 * started/succeeded pair for the whole retrieval phase so the monitoring UI sees
 * one retrieval phase, not two.
 */
export const retrieveAnonymizedAlertsByIds = async ({
  alertIds,
  alertsIndexPattern,
  anonymizationFields,
  apiConfig,
  logger,
  maxWaitMs,
  request,
  spaceId,
  workflowId,
  workflowsManagementApi,
}: RetrieveAnonymizedAlertsByIdsParams): Promise<RetrieveAnonymizedAlertsByIdsResult> => {
  logger.info(`Retrieving and anonymizing ${alertIds.length} curated alert(s) by _id`);

  const rawWorkflow = await workflowsManagementApi.getWorkflow(workflowId, spaceId);
  const validatedWorkflow = validateAlertRetrievalWorkflow(rawWorkflow, workflowId);

  // Build inputs with an Elasticsearch `ids` filter scoped to the curated set.
  // `start`/`end` are intentionally omitted so the ids filter alone selects the
  // alerts (the skill already constrained the time window when it curated them),
  // and `size` is the curated count so none are dropped.
  const workflowInputs = buildAlertRetrievalWorkflowInputs({
    alertsIndexPattern,
    anonymizationFields,
    apiConfig,
    filter: { ids: { values: alertIds } },
    size: alertIds.length,
  });

  const workflowToRun: WorkflowExecutionEngineModel = {
    definition: validatedWorkflow.definition,
    enabled: validatedWorkflow.enabled,
    id: validatedWorkflow.id,
    name: validatedWorkflow.name,
    yaml: validatedWorkflow.yaml,
  };

  const workflowRunId = await workflowsManagementApi.runWorkflow(
    workflowToRun,
    spaceId,
    workflowInputs,
    request
  );

  const execution = await pollForWorkflowCompletion({
    executionId: workflowRunId,
    isReady: (exec) =>
      exec.stepExecutions.some(
        (step) => step.stepType === 'security.attack-discovery.defaultAlertRetrieval'
      ),
    logger,
    ...(maxWaitMs != null ? { maxWaitMs } : {}),
    spaceId,
    workflowsManagementApi,
  });

  const extracted = extractAlertRetrievalResult({ apiConfig, execution });

  // Surface a requested-vs-resolved mismatch: curated ids were requested but the
  // retrieval resolved zero alerts (e.g. the ids no longer exist in the index).
  if (alertIds.length > 0 && extracted.alertsContextCount === 0) {
    logger.warn(
      `Requested ${
        alertIds.length
      } curated alert(s) by _id but none resolved; alert_ids=[${alertIds.join(', ')}]`
    );
  }

  logger.info(
    `Retrieved and anonymized ${extracted.alertsContextCount} alert(s) for the curated set`
  );

  return {
    alerts: extracted.alerts,
    alertsContextCount: extracted.alertsContextCount,
    anonymizedAlerts: extracted.anonymizedAlerts,
    connectorName: extracted.connectorName,
    replacements: extracted.replacements,
    workflowExecution: {
      workflowId,
      workflowName: validatedWorkflow.name,
      workflowRunId,
    },
    workflowRunId,
  };
};
