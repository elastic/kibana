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
import { ISOLATE_TOOL_ID } from '../..';
import {
  buildResponseActionComment,
  MAX_ACTION_COMMENT_LENGTH,
  dispatchErrorResult,
  summarizeActionErrors,
  waitForActionCompletion,
} from '../types';
import { hostTargetFields, requireHostTarget } from '../services/resolve_target';
import { buildDispatchConfirmation, prepareDispatch } from '../services/dispatch_action';

const isolateHostSchema = z
  .object({
    ...hostTargetFields('The hostname of the endpoint to isolate.'),
    comment: z
      .string()
      .min(1)
      .max(MAX_ACTION_COMMENT_LENGTH)
      .optional()
      .describe('An optional comment explaining why the host is being isolated.'),
  })
  .refine(requireHostTarget.check, { message: requireHostTarget.message });

export const isolateHostTool = (
  endpointAppContextService: EndpointAppContextService
): BuiltinSkillBoundedTool => {
  return {
    id: ISOLATE_TOOL_ID,
    type: ToolType.builtin,
    description: `Isolates a host by its hostname, exact IP address, or agent ID (pass the selected agent ID after an ambiguous_hostname or ambiguous_ip result). Isolation disconnects the endpoint from the network to contain a potential threat. The action is dispatched through the Elastic Defend Response Actions service.`,
    schema: isolateHostSchema,
    // HITL gate enforced by the framework, not skill prose: the runner prompts
    // the analyst for confirmation before every dispatch. `always` (not `once`)
    // so each host isolation is confirmed individually.
    confirmation: {
      askUser: 'always',
      getConfirmation: async ({ toolParams, context }) =>
        buildDispatchConfirmation(
          {
            action: 'isolate',
            params: {
              hostName: toolParams.hostName as string | undefined,
              ip: toolParams.ip as string | undefined,
              agentId: toolParams.agentId as string | undefined,
            },
            context,
            endpointAppContextService,
            requiredPrivilege: 'canIsolateHost',
          },
          {
            title: 'Isolate host?',
            color: 'danger',
            confirmText: 'Isolate host',
            comment: toolParams.comment as string | undefined,
            describe: (host) =>
              `This will disconnect ${host} from the network. Only Elastic Defend will retain connectivity.`,
          }
        ),
    },
    handler: async (params, context) => {
      const { logger, request, runContext, spaceId } = context;
      // Set just before the client call: from there on a throw does not mean
      // nothing was sent (see `dispatchErrorResult`).
      let dispatchAttempted = false;
      try {
        const requestedHostName = params.hostName as string | undefined;
        const requestedAgentId = params.agentId as string | undefined;
        const requestedIp = params.ip as string | undefined;
        const comment = params.comment as string | undefined;

        const prepared = await prepareDispatch({
          action: 'isolate',
          params: { hostName: requestedHostName, ip: requestedIp, agentId: requestedAgentId },
          context,
          endpointAppContextService,
          requiredPrivilege: 'canIsolateHost',
        });
        if (prepared.kind === 'result') {
          return prepared.result;
        }
        const { target } = prepared;

        const hostName = target.hostLabel;
        const { agentId, agentType } = target.endpoint;
        const endpointIds = [agentId];

        const responseActionsClient = endpointAppContextService.getInternalResponseActionsClient({
          spaceId,
          request,
          agentType,
          // Analyst-initiated via chat (gated behind HITL confirmation), not a
          // system/rule-triggered action — RESPONSE_ACTIONS_SUPPORT_MAP gates
          // `isolate` per agent type/action-type combination (see
          // is_response_action_supported.ts); `manual` is what a human
          // confirming in chat maps to.
          isAutomated: false,
        });

        dispatchAttempted = true;
        const dispatchedAction = await responseActionsClient.isolate(
          {
            endpoint_ids: endpointIds,
            comment: buildResponseActionComment(
              `Isolated via AI agent: ${hostName}`,
              runContext,
              comment
            ),
          },
          { hosts: { [endpointIds[0]]: { name: hostName } } }
        );

        const actionDetails =
          target.endpoint.status === 'offline'
            ? dispatchedAction
            : await waitForActionCompletion(
                endpointAppContextService,
                spaceId,
                dispatchedAction.id,
                logger,
                dispatchedAction
              );

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                kind: 'response_action_result' as const,
                action: 'isolate' as const,
                actionId: actionDetails.id,
                status: actionDetails.status,
                wasSuccessful: actionDetails.wasSuccessful,
                ...(target.endpoint.status === 'offline'
                  ? {
                      queued: true,
                      message:
                        'The action is queued and will execute when the endpoint reconnects.',
                    }
                  : summarizeActionErrors(actionDetails.errors) ?? {}),
                hosts: actionDetails.hosts,
                comment,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(error);
        return dispatchErrorResult('isolating host', error, { dispatchAttempted });
      }
    },
  };
};
