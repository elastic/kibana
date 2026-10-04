/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { z } from '@kbn/zod/v4';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { getToolResultId } from '@kbn/agent-builder-server/tools';

import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { RUNNING_PROCESSES_TOOL_ID } from '../..';
import {
  buildResponseActionComment,
  endpointNotFoundData,
  insufficientPrivilegesResult,
  MAX_ACTION_COMMENT_LENGTH,
  MAX_HOSTNAME_LENGTH,
  responseActionErrorResult,
  waitForActionCompletion,
} from '../types';
import { createEndpointLookupService } from '../services/endpoint_lookup';

const getRunningProcessesSchema = z.object({
  hostName: z
    .string()
    .min(1)
    .max(MAX_HOSTNAME_LENGTH)
    .describe('The hostname of the endpoint to list running processes for.'),
  comment: z
    .string()
    .min(1)
    .max(MAX_ACTION_COMMENT_LENGTH)
    .optional()
    .describe('An optional comment explaining why the process list is being retrieved.'),
});

/**
 * Read-only inspection action: retrieves the list of running processes from an
 * enrolled Elastic Defend host. Read-only actions do not require a human
 * confirmation step (see the skill system instructions).
 */
export const getRunningProcessesTool = (
  endpointAppContextService: EndpointAppContextService
): BuiltinSkillBoundedTool => {
  return {
    id: RUNNING_PROCESSES_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves the list of running processes from a host by its hostname. Dispatches a running-processes response action through the Elastic Defend Response Actions service. The action enqueues on the endpoint and returns the process list once the host checks in.`,
    schema: getRunningProcessesSchema,
    handler: async (params, { logger, request, runContext, spaceId }) => {
      try {
        const hostName = params.hostName as string;
        const comment = params.comment as string | undefined;

        // Despite the "read-only inspection" framing, this enqueues a real
        // `running-processes` response action on the host, and the HTTP route
        // gates it behind `withEndpointAuthz({ all: ['canGetRunningProcesses'] })`.
        // The internal client skips that check, so assert the caller's privilege
        // here to keep chat access from bypassing endpoint RBAC.
        const authz = await endpointAppContextService.getEndpointAuthz(request);
        if (!authz.canGetRunningProcesses) {
          return insufficientPrivilegesResult('canGetRunningProcesses');
        }

        // Resolve hostname -> endpoint id + EDR vendor. The service handles
        // hostname escaping, space validation, and multi-vendor `agentType`
        // resolution in one place so every host-lookup tool behaves the same.
        const lookup = createEndpointLookupService(endpointAppContextService, spaceId);
        const resolved = await lookup.resolveByHostName(hostName);

        if (resolved.kind === 'not_found') {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
                data: endpointNotFoundData(hostName),
              },
            ],
          };
        }

        if (resolved.kind === 'ambiguous') {
          // Ambiguity is a first-class lookup outcome, not an error: two live
          // machines can share a hostname, and a write action must never guess
          // which one to act on. Surface the candidates and ask the analyst to
          // identify the target by agent ID before retrying.
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
                data: {
                  kind: 'response_action_result' as const,
                  action: 'running-processes' as const,
                  hostName,
                  found: false,
                  reason: 'ambiguous_hostname' as const,
                  candidates: resolved.candidates,
                  ...(resolved.truncated
                    ? { truncated: true as const, totalCandidates: resolved.totalCandidates }
                    : {}),
                  message: resolved.truncated
                    ? `More endpoints match the hostname "${hostName}" than could be examined, so it cannot be resolved to a single host. Ask the analyst to identify the target by agent ID before retrying.`
                    : `Multiple online endpoints share the hostname "${hostName}". Ask the analyst to identify the target by agent ID before retrying — a write action must not guess.`,
                },
              },
            ],
          };
        }

        const { agentId, agentType } = resolved.endpoint;
        const endpointIds = [agentId];

        const responseActionsClient = endpointAppContextService.getInternalResponseActionsClient({
          spaceId,
          request,
          agentType,
          // Analyst-initiated via chat, not a system/rule-triggered action —
          // RESPONSE_ACTIONS_SUPPORT_MAP gates `running-processes` per agent
          // type/action-type combination (see is_response_action_supported.ts);
          // `manual` is what a human confirming in chat maps to.
          isAutomated: false,
        });

        const dispatchedAction = await responseActionsClient.runningProcesses(
          {
            endpoint_ids: endpointIds,
            comment: buildResponseActionComment(
              `Running processes requested via AI agent: ${hostName}`,
              runContext,
              comment
            ),
          },
          { hosts: { [endpointIds[0]]: { name: hostName } } }
        );

        // The dispatch above returns the action's write-time snapshot
        // (almost always `pending` — the endpoint agent hasn't checked in
        // yet). Poll until Elastic Defend reports completion so the chat
        // response reflects the actual process list, not just "dispatched".
        const actionDetails = await waitForActionCompletion(
          endpointAppContextService,
          spaceId,
          dispatchedAction.id,
          logger
        );

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                kind: 'response_action_result' as const,
                action: 'running-processes' as const,
                hostName,
                found: true,
                actionId: actionDetails.id,
                status: actionDetails.status,
                wasSuccessful: actionDetails.wasSuccessful,
                hosts: actionDetails.hosts,
                outputs: actionDetails.outputs,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(error);
        return responseActionErrorResult(
          'unknown_error',
          `Error retrieving running processes: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    },
  };
};
