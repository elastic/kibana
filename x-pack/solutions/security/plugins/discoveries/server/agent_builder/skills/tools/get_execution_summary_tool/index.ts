/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';

import type { WorkflowFetcher } from '../get_workflow_health_check_tool';

export const GET_EXECUTION_SUMMARY_TOOL_ID = 'security.attack-discovery.get_execution_summary';

/** @deprecated Use {@link WorkflowFetcher} instead */
export type WorkflowExecutionFetcher = Pick<WorkflowFetcher, 'getWorkflowExecution'>;

interface StepSummary {
  error: WorkflowStepExecutionDto['error'];
  executionTimeMs: WorkflowStepExecutionDto['executionTimeMs'];
  status: WorkflowStepExecutionDto['status'];
  stepId: WorkflowStepExecutionDto['stepId'];
  stepType: WorkflowStepExecutionDto['stepType'];
  topologicalIndex: WorkflowStepExecutionDto['topologicalIndex'];
}

interface ExecutionSummary {
  duration: WorkflowExecutionDto['duration'];
  error: WorkflowExecutionDto['error'];
  finishedAt: WorkflowExecutionDto['finishedAt'];
  startedAt: WorkflowExecutionDto['startedAt'];
  status: WorkflowExecutionDto['status'] | 'not_found';
  steps: StepSummary[];
  workflowName: WorkflowExecutionDto['workflowName'];
  yaml: WorkflowExecutionDto['yaml'];
}

interface NotFoundSummary {
  duration: null;
  error: string;
  finishedAt: null;
  startedAt: null;
  status: 'not_found';
  steps: [];
  workflowName: null;
  yaml: null;
}

const toStepSummary = ({
  error,
  executionTimeMs,
  status,
  stepId,
  stepType,
  topologicalIndex,
}: WorkflowStepExecutionDto): StepSummary => ({
  error,
  executionTimeMs,
  status,
  stepId,
  stepType,
  topologicalIndex,
});

const toExecutionSummary = (execution: WorkflowExecutionDto): ExecutionSummary => ({
  duration: execution.duration,
  error: execution.error,
  finishedAt: execution.finishedAt,
  startedAt: execution.startedAt,
  status: execution.status,
  steps: execution.stepExecutions.map(toStepSummary),
  workflowName: execution.workflowName,
  yaml: execution.yaml,
});

const toNotFoundSummary = (runId: string): NotFoundSummary => ({
  duration: null,
  error: `Execution not found for run ID: ${runId}`,
  finishedAt: null,
  startedAt: null,
  status: 'not_found',
  steps: [],
  workflowName: null,
  yaml: null,
});

const fetchAndSummarize = async (
  runId: string,
  spaceId: string,
  fetcher: WorkflowExecutionFetcher
): Promise<ExecutionSummary | NotFoundSummary> => {
  const execution = await fetcher.getWorkflowExecution(runId, spaceId, {
    includeInput: false,
    includeOutput: false,
  });

  return execution != null ? toExecutionSummary(execution) : toNotFoundSummary(runId);
};

const inputSchema = z.object({
  alert_retrieval_run_ids: z
    .array(
      z.object({
        workflow_id: z.string(),
        workflow_run_id: z.string(),
      })
    )
    .optional(),
  generation_run_id: z.string().optional(),
  generation_workflow_id: z.string().optional(),
  validation_run_id: z.string().optional(),
  validation_workflow_id: z.string().optional(),
});

export const getExecutionSummaryTool = (
  fetcher: WorkflowExecutionFetcher
): BuiltinSkillBoundedTool<typeof inputSchema> => ({
  description:
    'Fetches workflow execution details and YAML for all Attack Discovery pipeline phases (alert retrieval, generation, validation) in a single call. Returns per-step status, errors, and timing without exposing step inputs or outputs.',
  handler: async (args, context) => {
    try {
      const { spaceId } = context;

      const alertRetrievalPromises = (args.alert_retrieval_run_ids ?? []).map(
        ({ workflow_run_id }) => fetchAndSummarize(workflow_run_id, spaceId, fetcher)
      );

      const [alertRetrieval, generation, validation] = await Promise.all([
        Promise.all(alertRetrievalPromises),
        args.generation_run_id != null
          ? fetchAndSummarize(args.generation_run_id, spaceId, fetcher)
          : null,
        args.validation_run_id != null
          ? fetchAndSummarize(args.validation_run_id, spaceId, fetcher)
          : null,
      ]);

      return {
        results: [
          {
            data: {
              alert_retrieval: alertRetrieval,
              generation,
              validation,
            },
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          {
            data: {
              message: `Failed to fetch execution summary: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
            },
            tool_result_id: getToolResultId(),
            type: ToolResultType.error,
          },
        ],
      };
    }
  },
  id: GET_EXECUTION_SUMMARY_TOOL_ID,
  schema: inputSchema,
  type: ToolType.builtin,
});
