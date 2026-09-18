/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { AttackDiscoveryApiAlert } from '@kbn/discoveries-schemas';
import { isWorkflowsEnabled } from '@kbn/discoveries/impl/lib/helpers/is_workflows_enabled';
import { ExecutionStatus, type WorkflowExecutionDto } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';

import type { DiscoveriesPluginStartDeps } from '../../../../types';
import { extractPipelineValidationData } from '../../../../routes/get/pipeline_data/helpers/extract_pipeline_validation_data';
import { getWorkflowExecutionsTracking } from '../../../../routes/get/pipeline_data/helpers/get_workflow_executions_tracking';

export const GET_ATTACK_DISCOVERY_STATUS_TOOL_ID = 'security.attack-discovery.get_status';

export type AttackDiscoveryRunStatus = 'succeeded' | 'running' | 'failed' | 'not_found';

export type AttackDiscoveryRunPhase = 'alert_retrieval' | 'generation' | 'validation';

export interface AttackDiscoveryStatusResult {
  attack_discoveries: AttackDiscoveryApiAlert[] | null;
  error_message: string | null;
  execution_uuid: string;
  phase: AttackDiscoveryRunPhase | null;
  status: AttackDiscoveryRunStatus;
}

export interface WorkflowExecutionLookup {
  getWorkflowExecution: (
    executionId: string,
    spaceId: string,
    options?: { includeInput?: boolean; includeOutput?: boolean }
  ) => Promise<WorkflowExecutionDto | null>;
}

const inputSchema = z.object({
  execution_uuid: z
    .string()
    .min(1)
    .describe(
      `The Attack Discovery generation \`execution_uuid\` returned by the \`security.attack-discovery.run\` workflow step. Use this to check whether a previously-started generation has completed and to retrieve its discoveries.`
    ),
});

const buildResult = (
  partial: Partial<AttackDiscoveryStatusResult> & { execution_uuid: string }
) => ({
  attack_discoveries: null,
  error_message: null,
  phase: null,
  status: 'running' as const,
  ...partial,
});

const isFailedStatus = (status: ExecutionStatus): boolean =>
  status === ExecutionStatus.FAILED ||
  status === ExecutionStatus.CANCELLED ||
  status === ExecutionStatus.TIMED_OUT;

const toErrorMessage = (error: WorkflowExecutionDto['error']): string | null => {
  if (error == null) {
    return null;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return null;
};

export const getAttackDiscoveryStatusTool = ({
  getEventLogIndex,
  getStartServices,
  workflowExecutionLookup,
}: {
  getEventLogIndex: () => Promise<string>;
  getStartServices?: () => Promise<{
    coreStart: CoreStart;
    pluginsStart: DiscoveriesPluginStartDeps;
  }>;
  workflowExecutionLookup: WorkflowExecutionLookup;
}): BuiltinSkillBoundedTool<typeof inputSchema> => ({
  description: `Look up the current status of an Attack Discovery generation by its \`execution_uuid\`. Returns one of \`succeeded\`, \`running\`, \`failed\`, or \`not_found\`. When succeeded, includes the validated \`attack_discoveries\` so the agent can emit insights JSON. When running, includes the current \`phase\` (alert_retrieval, generation, or validation). Use this to resume a slow-path generation that returned only an \`execution_uuid\` because it exceeded the run step's soft deadline, and whenever the user asks about the status of a previously-started generation.`,
  handler: async (args, context) => {
    const { execution_uuid: executionUuid } = args;
    const { esClient, logger, spaceId } = context;

    try {
      // Kill-switch backstop: even though the skill is not registered when the
      // feature flag is OFF at startup, guard per-invocation so a runtime flip to
      // OFF does no real work (no event-log read) on an already-registered tool.
      if (getStartServices != null) {
        const { coreStart } = await getStartServices();
        if (!(await isWorkflowsEnabled(coreStart.featureFlags))) {
          return {
            results: [
              {
                data: { message: 'Attack Discovery workflows are not enabled' },
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
              },
            ],
          };
        }
      }

      const eventLogIndex = await getEventLogIndex();

      // Object-level authorization: bind the event-log read to the requesting
      // principal so the status of another user's execution cannot be read by
      // supplying/guessing its id within the same space.
      const { username } = await esClient.asCurrentUser.security.authenticate();

      const tracking = await getWorkflowExecutionsTracking({
        esClient: esClient.asCurrentUser,
        eventLogIndex,
        executionId: executionUuid,
        spaceId,
        username,
      });

      if (tracking == null) {
        return {
          results: [
            {
              data: buildResult({
                execution_uuid: executionUuid,
                status: 'not_found',
              }),
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
            },
          ],
        };
      }

      if (tracking.validation != null) {
        const validationExecution = await workflowExecutionLookup.getWorkflowExecution(
          tracking.validation.workflowRunId,
          spaceId,
          { includeOutput: true }
        );

        if (validationExecution == null) {
          return {
            results: [
              {
                data: buildResult({
                  execution_uuid: executionUuid,
                  phase: 'validation',
                  status: 'running',
                }),
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
              },
            ],
          };
        }

        if (validationExecution.status === ExecutionStatus.COMPLETED) {
          const discoveries = extractPipelineValidationData({ execution: validationExecution });

          return {
            results: [
              {
                data: buildResult({
                  attack_discoveries: discoveries,
                  execution_uuid: executionUuid,
                  phase: 'validation',
                  status: 'succeeded',
                }),
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
              },
            ],
          };
        }

        if (isFailedStatus(validationExecution.status)) {
          return {
            results: [
              {
                data: buildResult({
                  error_message: toErrorMessage(validationExecution.error),
                  execution_uuid: executionUuid,
                  phase: 'validation',
                  status: 'failed',
                }),
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
              },
            ],
          };
        }

        return {
          results: [
            {
              data: buildResult({
                execution_uuid: executionUuid,
                phase: 'validation',
                status: 'running',
              }),
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
            },
          ],
        };
      }

      if (tracking.generation != null) {
        const generationExecution = await workflowExecutionLookup.getWorkflowExecution(
          tracking.generation.workflowRunId,
          spaceId
        );

        if (generationExecution != null && isFailedStatus(generationExecution.status)) {
          return {
            results: [
              {
                data: buildResult({
                  error_message: toErrorMessage(generationExecution.error),
                  execution_uuid: executionUuid,
                  phase: 'generation',
                  status: 'failed',
                }),
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
              },
            ],
          };
        }

        return {
          results: [
            {
              data: buildResult({
                execution_uuid: executionUuid,
                phase: 'generation',
                status: 'running',
              }),
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
            },
          ],
        };
      }

      return {
        results: [
          {
            data: buildResult({
              execution_uuid: executionUuid,
              phase: 'alert_retrieval',
              status: 'running',
            }),
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
          },
        ],
      };
    } catch (error) {
      logger.error(
        `Failed to fetch Attack Discovery status for execution_uuid=${executionUuid}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      return {
        results: [
          {
            data: {
              message: `Failed to fetch Attack Discovery status: ${
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
  id: GET_ATTACK_DISCOVERY_STATUS_TOOL_ID,
  schema: inputSchema,
  type: ToolType.builtin,
});
