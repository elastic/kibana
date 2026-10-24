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
  MAX_ACTION_COMMENT_LENGTH,
  dispatchErrorResult,
  summarizeActionErrors,
  RUNNING_PROCESSES_MAX_RESULT_TOKENS,
  summarizeActionHosts,
  summarizeActionOutputs,
  waitForActionCompletion,
} from '../types';
import { hostTargetFields, requireHostTarget } from '../services/resolve_target';
import { buildDispatchConfirmation, prepareDispatch } from '../services/dispatch_action';

const getRunningProcessesSchema = z
  .object({
    ...hostTargetFields('The hostname of the endpoint to list running processes for.'),
    comment: z
      .string()
      .min(1)
      .max(MAX_ACTION_COMMENT_LENGTH)
      .optional()
      .describe('An optional comment explaining why the process list is being retrieved.'),
  })
  .refine(requireHostTarget.check, { message: requireHostTarget.message });

/**
 * Inspection action: retrieves the list of running processes from an enrolled
 * Elastic Defend host. It enqueues a real `running-processes` response action
 * on the endpoint, so every dispatch is gated by an analyst confirmation.
 */
export const getRunningProcessesTool = (
  endpointAppContextService: EndpointAppContextService
): BuiltinSkillBoundedTool => {
  return {
    id: RUNNING_PROCESSES_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves the list of running processes from a host by its hostname, exact IP address, or agent ID (pass the selected agent ID after an ambiguous_hostname or ambiguous_ip result). Dispatches a running-processes response action through the Elastic Defend Response Actions service. The action enqueues on the endpoint and returns the process list once the host checks in.`,
    schema: getRunningProcessesSchema,
    maxResultTokens: RUNNING_PROCESSES_MAX_RESULT_TOKENS,
    // HITL gate enforced by the framework, not skill prose: the runner prompts
    // the analyst for confirmation before every dispatch.
    confirmation: {
      askUser: 'always',
      getConfirmation: async ({ toolParams, context }) =>
        buildDispatchConfirmation(
          {
            action: 'running-processes',
            params: {
              hostName: toolParams.hostName as string | undefined,
              ip: toolParams.ip as string | undefined,
              agentId: toolParams.agentId as string | undefined,
            },
            context,
            endpointAppContextService,
            requiredPrivilege: 'canGetRunningProcesses',
          },
          {
            title: 'List running processes?',
            color: 'primary',
            confirmText: 'List processes',
            comment: toolParams.comment as string | undefined,
            describe: (host) => `This will request the list of running processes from ${host}.`,
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
          action: 'running-processes',
          params: { hostName: requestedHostName, ip: requestedIp, agentId: requestedAgentId },
          context,
          endpointAppContextService,
          requiredPrivilege: 'canGetRunningProcesses',
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
          // Analyst-initiated via chat, not a system/rule-triggered action —
          // RESPONSE_ACTIONS_SUPPORT_MAP gates `running-processes` per agent
          // type/action-type combination (see is_response_action_supported.ts);
          // `manual` is what a human confirming in chat maps to.
          isAutomated: false,
        });

        dispatchAttempted = true;
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
                action: 'running-processes' as const,
                hostName,
                found: true,
                actionId: actionDetails.id,
                status: actionDetails.status,
                wasSuccessful: actionDetails.wasSuccessful,
                // Why a failed action failed (bounded); without it the model
                // sees only `status: failed`.
                ...(summarizeActionErrors(actionDetails.errors) ?? {}),
                // Bounded: `outputs` carries one entry per running process, each
                // with its full command line, so a busy host would otherwise blow
                // the result budget and have generic truncation discard process
                // data. The summary keeps a capped sample and reports what it
                // dropped (`entriesTruncated`, `truncatedFields`, ...).
                ...(summarizeActionHosts(actionDetails.hosts) ?? {}),
                outputs: summarizeActionOutputs(actionDetails.outputs),
              },
            },
          ],
        };
      } catch (error) {
        logger.error(error);
        return dispatchErrorResult('retrieving running processes', error, { dispatchAttempted });
      }
    },
  };
};
