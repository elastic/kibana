/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { getToolResultId } from '@kbn/agent-builder-server/tools';

import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { UNISOLATE_TOOL_ID } from '../..';
import {
  buildResponseActionComment,
  MAX_ACTION_COMMENT_LENGTH,
  dispatchErrorResult,
  summarizeActionErrors,
  waitForActionCompletion,
} from '../types';
import { hostTargetFields, requireHostTarget } from '../services/resolve_target';
import { prepareDispatch } from '../services/dispatch_action';

const unisolateHostSchema = z
  .object({
    ...hostTargetFields('The hostname of the endpoint to un-isolate.'),
    comment: z
      .string()
      .min(1)
      .max(MAX_ACTION_COMMENT_LENGTH)
      .optional()
      .describe('An optional comment explaining why the host is being un-isolated.'),
  })
  .refine(requireHostTarget.check, { message: requireHostTarget.message });

export const unisolateHostTool = (
  endpointAppContextService: EndpointAppContextService
): BuiltinSkillBoundedTool => {
  return {
    id: UNISOLATE_TOOL_ID,
    type: ToolType.builtin,
    description: `Un-isolates a host by its hostname or agent ID (pass the agent ID, from an ambiguous_hostname result, when several endpoints share the hostname). Re-establishes network connectivity on an endpoint that was previously isolated. The action is dispatched through the Elastic Defend Response Actions service.`,
    schema: unisolateHostSchema,
    handler: async (params, context) => {
      const { logger, request, runContext, spaceId } = context;
      // Set just before the client call: from there on a throw does not mean
      // nothing was sent (see `dispatchErrorResult`).
      let dispatchAttempted = false;
      try {
        const requestedHostName = params.hostName as string | undefined;
        const requestedAgentId = params.agentId as string | undefined;
        const comment = params.comment as string | undefined;

        const prepared = await prepareDispatch({
          action: 'unisolate',
          params: { hostName: requestedHostName, agentId: requestedAgentId },
          args: { comment },
          context,
          endpointAppContextService,
          requiredPrivilege: 'canUnIsolateHost',
          confirmation: {
            title: i18n.translate(
              'xpack.securitySolution.endpointResponseActionsSkill.confirmation.unisolate.title',
              {
                defaultMessage: 'Release host from isolation?',
              }
            ),
            color: 'warning',
            confirmText: i18n.translate(
              'xpack.securitySolution.endpointResponseActionsSkill.confirmation.unisolate.confirmText',
              {
                defaultMessage: 'Release host',
              }
            ),
            comment: params.comment as string | undefined,
            describe: (host) =>
              i18n.translate(
                'xpack.securitySolution.endpointResponseActionsSkill.confirmation.unisolate.message',
                {
                  defaultMessage: 'This will reconnect {host} to the network.',
                  values: { host },
                }
              ),
          },
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
          // `unisolate` per agent type/action-type combination (see
          // is_response_action_supported.ts); `manual` is what a human
          // confirming in chat maps to.
          isAutomated: false,
        });

        // Note: the ResponseActionsClient method is called `release`, not `unisolate`
        dispatchAttempted = true;
        const dispatchedAction = await responseActionsClient.release(
          {
            endpoint_ids: endpointIds,
            comment: buildResponseActionComment(
              `Un-isolated via AI agent: ${hostName}`,
              runContext,
              comment
            ),
          },
          { hosts: { [endpointIds[0]]: { name: hostName } } }
        );

        // The dispatch above returns the action's write-time snapshot
        // (almost always `pending` — the endpoint agent hasn't checked in
        // yet). Poll until Elastic Defend reports completion so the chat
        // response reflects the actual outcome, not just "dispatched".
        const actionDetails = await waitForActionCompletion(
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
                action: 'unisolate' as const,
                actionId: actionDetails.id,
                status: actionDetails.status,
                wasSuccessful: actionDetails.wasSuccessful,
                // Why a failed action failed (bounded); without it the model
                // sees only `status: failed`.
                ...(summarizeActionErrors(actionDetails.errors) ?? {}),
                hosts: actionDetails.hosts,
                comment,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(error);
        return dispatchErrorResult('un-isolating host', error, { dispatchAttempted });
      }
    },
  };
};
