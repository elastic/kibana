/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { WorkflowDetailDto, WorkflowExecutionDto } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';

export const GET_WORKFLOW_HEALTH_CHECK_TOOL_ID =
  'security.attack-discovery.get_workflow_health_check';

export interface WorkflowFetcher {
  getWorkflow: (workflowId: string, spaceId: string) => Promise<WorkflowDetailDto | null>;
  getWorkflowExecution: (
    executionId: string,
    spaceId: string,
    options?: { includeInput?: boolean; includeOutput?: boolean }
  ) => Promise<WorkflowExecutionDto | null>;
}

interface WorkflowHealth {
  enabled: boolean;
  found: boolean;
  id: string;
  last_modified?: string;
  name: string | null;
  valid: boolean;
}

const toWorkflowHealth = (id: string, workflow: WorkflowDetailDto | null): WorkflowHealth => {
  if (workflow == null) {
    return {
      enabled: false,
      found: false,
      id,
      name: null,
      valid: false,
    };
  }

  return {
    enabled: workflow.enabled,
    found: true,
    id,
    last_modified: workflow.lastUpdatedAt,
    name: workflow.name,
    valid: workflow.valid,
  };
};

const inputSchema = z.object({
  workflow_ids: z.array(z.string()),
});

export const getWorkflowHealthCheckTool = (
  fetcher: WorkflowFetcher
): BuiltinSkillBoundedTool<typeof inputSchema> => ({
  description:
    'Inspects the current state of configured workflows (enabled/valid/found). Use this tool when alert retrieval phases are empty or missing, to determine whether configured workflows are disabled, deleted, or invalid before diagnosing the root cause.',
  handler: async (args, context) => {
    try {
      const { spaceId } = context;

      const healthResults = await Promise.all(
        args.workflow_ids.map(async (workflowId) => {
          const workflow = await fetcher.getWorkflow(workflowId, spaceId);
          return toWorkflowHealth(workflowId, workflow);
        })
      );

      return {
        results: [
          {
            data: { workflows: healthResults },
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
              message: `Failed to fetch workflow health: ${
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
  id: GET_WORKFLOW_HEALTH_CHECK_TOOL_ID,
  schema: inputSchema,
  type: ToolType.builtin,
});
