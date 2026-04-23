/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import pMap from 'p-map';
import type { IKibanaResponse, RequestHandler } from '@kbn/core/server';
import { ExecutionStatus } from '@kbn/agent-builder-plugin/server';
import { AgentExecutionMode } from '@kbn/agent-builder-common';
import type { CreateWorkflowInsightRequestBody } from '../../../../common/api/endpoint/workflow_insights';
import { CreateWorkflowInsightRequestSchema } from '../../../../common/api/endpoint/workflow_insights/workflow_insights';
import type { WorkflowInsightType } from '../../../../common/endpoint/types/workflow_insights';
import { errorHandler } from '../error_handler';
import { WORKFLOW_INSIGHTS_ROUTE } from '../../../../common/endpoint/constants';
import { withEndpointAuthz } from '../with_endpoint_authz';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import { AUTOMATIC_TROUBLESHOOTING_TAG, MAX_COMBOS } from '.';
import { generatePrompt } from './trigger_messages';

interface ExecutionResult {
  executionId: string;
  conversationId?: string;
  insightType: WorkflowInsightType;
  endpointId: string;
  '@timestamp'?: string;
}

interface ExecutionFailure {
  insightType: WorkflowInsightType;
  endpointId: string;
  error: string;
}

export const registerCreateInsightsRoute = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  router.versioned
    .post({
      access: 'internal',
      path: WORKFLOW_INSIGHTS_ROUTE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: { request: CreateWorkflowInsightRequestSchema },
      },
      withEndpointAuthz(
        { all: ['canWriteWorkflowInsights'] },
        endpointContext.logFactory.get('workflowInsights'),
        createInsightsRouteHandler(endpointContext)
      )
    );
};

const createInsightsRouteHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  never,
  never,
  CreateWorkflowInsightRequestBody,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointContext.logFactory.get('workflowInsights');

  return async (
    context,
    request,
    response
  ): Promise<IKibanaResponse<{ executions: ExecutionResult[]; failures?: ExecutionFailure[] }>> => {
    const { automaticTroubleshootingSkill } = endpointContext.experimentalFeatures;

    if (!automaticTroubleshootingSkill) {
      return response.badRequest({
        body: 'automaticTroubleshootingSkill feature flag is disabled',
      });
    }

    const { insightTypes, endpointIds, connectorId } = request.body;
    const totalCombos = insightTypes.length * endpointIds.length;
    if (totalCombos > MAX_COMBOS) {
      return response.badRequest({
        body: `Too many combinations (${totalCombos}). Maximum is ${MAX_COMBOS}.`,
      });
    }

    try {
      const agentBuilder = endpointContext.service.getAgentBuilder();

      // O(1) ES query: find all in-flight executions for this tag regardless of combo.
      // Filter in-memory to detect which insightType/endpointId combos are already running.
      // Known limitation: each execution stores a single endpointId in metadata.
      // Revisit if we need real multi-endpoint support (e.g., array filtering in FindExecutionsFilter).
      const inFlightExecutions = await agentBuilder.execution.findExecutions(request, {
        filter: {
          metadata: { source: AUTOMATIC_TROUBLESHOOTING_TAG },
          status: [ExecutionStatus.running, ExecutionStatus.scheduled],
        },
        size: 100,
      });

      // Build a set of already-running insightType/endpointId combos
      const inFlightSet = new Set<string>(
        inFlightExecutions.map(
          (exec) => `${exec.metadata?.insightType ?? ''}::${exec.metadata?.endpointId ?? ''}`
        )
      );

      // Build list of combos to create and list of already-running ones to include in response
      const combos: Array<{ insightType: WorkflowInsightType; endpointId: string }> = [];
      const alreadyRunning: ExecutionResult[] = [];

      for (const insightType of insightTypes) {
        for (const endpointId of endpointIds) {
          const key = `${insightType}::${endpointId}`;
          if (inFlightSet.has(key)) {
            const existing = inFlightExecutions.find(
              (exec) =>
                exec.metadata?.insightType === insightType &&
                exec.metadata?.endpointId === endpointId
            );
            if (existing) {
              alreadyRunning.push({
                executionId: existing.executionId,
                conversationId:
                  existing.executionMode === AgentExecutionMode.conversation
                    ? existing.agentParams.conversationId
                    : undefined,
                insightType,
                endpointId,
                '@timestamp': existing['@timestamp'],
              });
            }
          } else {
            combos.push({ insightType, endpointId });
          }
        }
      }

      // Create executions for new combos; use continue-and-collect for partial failure handling.
      // Bound parallelism to 5 to protect against large N×M misuse.
      const newExecutions = await pMap(
        combos,
        async ({
          insightType,
          endpointId,
        }): Promise<
          { ok: true; result: ExecutionResult } | { ok: false; failure: ExecutionFailure }
        > => {
          try {
            const conversationId = uuidv4();
            const metadata: Record<string, string> = {
              source: AUTOMATIC_TROUBLESHOOTING_TAG,
              insightType,
              endpointId,
            };

            const message = generatePrompt(insightType, endpointId);

            const createdAt = new Date().toISOString();
            const { executionId } = await agentBuilder.execution.executeAgent({
              mode: AgentExecutionMode.conversation,
              request,
              metadata,
              params: {
                ...(connectorId ? { connectorId } : {}),
                conversationId,
                autoCreateConversationWithId: true,
                nextInput: { message },
              },
            });

            return {
              ok: true,
              result: {
                executionId,
                conversationId,
                insightType,
                endpointId,
                '@timestamp': createdAt,
              },
            };
          } catch (e) {
            logger.warn(
              `Failed to create execution for ${insightType}/${endpointId}: ${e.message}`
            );
            return {
              ok: false,
              failure: { insightType, endpointId, error: e.message },
            };
          }
        },
        { concurrency: 5 }
      );

      const createdExecutions: ExecutionResult[] = [];
      const failures: ExecutionFailure[] = [];
      for (const entry of newExecutions) {
        if (entry.ok) {
          createdExecutions.push(entry.result);
        } else {
          failures.push(entry.failure);
        }
      }

      // Include deduplicated (already-running) executions so the FE can always start polling
      const executions: ExecutionResult[] = [...alreadyRunning, ...createdExecutions];

      return response.ok({
        body: { executions, ...(failures.length > 0 ? { failures } : {}) },
      });
    } catch (e) {
      return errorHandler(logger, response, e);
    }
  };
};
