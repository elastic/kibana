/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';

import type { WorkflowsManagementApi } from './invoke_alert_retrieval_workflow';

/** Identifies the report run in the workflow execution history. */
const TRIGGERED_BY = 'attack-discovery-skill-report';

/**
 * Parameters for invoking the managed skill report workflow.
 */
export interface InvokeSkillReportWorkflowParams {
  /**
   * GenAI connector id selected for this generation. Forwarded to the report
   * `ai.agent` step (Constraint A) so the report is rendered by the model the
   * user selected rather than the Agent Builder default. When empty, it is
   * omitted so the step falls back to the Agent Builder default model.
   */
  connectorId: string;
  /** Persisted Agent Builder conversation id to resume (continue) with the report. */
  conversationId: string;
  /** The AD 2.0 generation `execution_uuid` whose discoveries should be rendered. */
  executionUuid: string;
  logger: Logger;
  request: KibanaRequest;
  spaceId: string;
  /** Managed skill report workflow id. */
  workflowId: string;
  workflowsManagementApi: WorkflowsManagementApi;
}

/**
 * Phase-2 (Mode B) resumable reporting: schedules the managed skill report
 * workflow, which resumes the persisted Agent Builder conversation (created by
 * the skill alert retrieval workflow) so the `attack-discovery-generator` skill
 * renders the full Attack Discovery Report into that same conversation.
 *
 * This is invoked fire-and-forget after AD 2.0 generation + validation succeed:
 * it schedules the workflow (via the task manager) and returns immediately,
 * without polling for completion. All errors are caught and logged so a report
 * failure can never block or fail the AD 2.0 generation outcome.
 */
export const invokeSkillReportWorkflow = async ({
  connectorId,
  conversationId,
  executionUuid,
  logger,
  request,
  spaceId,
  workflowId,
  workflowsManagementApi,
}: InvokeSkillReportWorkflowParams): Promise<void> => {
  try {
    const rawWorkflow = await workflowsManagementApi.getWorkflow(workflowId, spaceId);

    if (rawWorkflow == null || rawWorkflow.definition == null) {
      logger.warn(
        `Skill report workflow (id: ${workflowId}) not found or missing a definition; skipping resumable report for execution_uuid=${executionUuid}`
      );
      return;
    }

    const workflowToRun: WorkflowExecutionEngineModel = {
      definition: rawWorkflow.definition,
      enabled: rawWorkflow.enabled,
      id: rawWorkflow.id,
      name: rawWorkflow.name,
      yaml: rawWorkflow.yaml,
    };

    const workflowRunId = await workflowsManagementApi.scheduleWorkflow(
      workflowToRun,
      spaceId,
      {
        ...(connectorId ? { connector_id: connectorId } : {}),
        conversation_id: conversationId,
        execution_uuid: executionUuid,
      },
      request,
      TRIGGERED_BY
    );

    logger.info(
      `Scheduled skill report workflow (workflowRunId: ${workflowRunId}) to resume conversation ${conversationId} for execution_uuid=${executionUuid}`
    );
  } catch (error) {
    logger.error(
      `Failed to schedule skill report workflow for execution_uuid=${executionUuid}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
