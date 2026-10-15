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
import { SCAN_TOOL_ID } from '../..';
import {
  buildResponseActionComment,
  MAX_ACTION_COMMENT_LENGTH,
  MAX_FILE_PATH_LENGTH,
  dispatchErrorResult,
  summarizeActionErrors,
  waitForActionCompletion,
} from '../types';
import { hostTargetFields, requireHostTarget } from '../services/resolve_target';
import { buildDispatchConfirmation, prepareDispatch } from '../services/dispatch_action';

const scanHostSchema = z
  .object({
    ...hostTargetFields('The hostname of the endpoint to scan for malware.'),
    path: z
      .string()
      .trim()
      .min(1)
      .max(MAX_FILE_PATH_LENGTH)
      .describe('The absolute file or folder path on the endpoint to scan for malware.'),
    comment: z
      .string()
      .min(1)
      .max(MAX_ACTION_COMMENT_LENGTH)
      .optional()
      .describe('An optional comment explaining why the scan is being performed.'),
  })
  .refine(requireHostTarget.check, { message: requireHostTarget.message });

/**
 * Malware scan action. `scan` only detects malware on the provided path using
 * the endpoint's existing Elastic Defend policy — it does not execute or modify
 * anything on the host. It is nonetheless classified as a write action and
 * therefore always requires an explicit human confirmation step before the
 * skill dispatches it (see the skill system instructions).
 */
export const scanHostTool = (
  endpointAppContextService: EndpointAppContextService
): BuiltinSkillBoundedTool => {
  return {
    id: SCAN_TOOL_ID,
    type: ToolType.builtin,
    description: `Scans a file or folder path on a host (identified by hostname, or by agent ID when several endpoints share the hostname) for malware using the endpoint's existing Elastic Defend policy. The action is dispatched through the Elastic Defend Response Actions service. Requires explicit analyst confirmation before dispatch.`,
    schema: scanHostSchema,
    // HITL gate enforced by the framework, not skill prose: the runner prompts
    // the analyst for confirmation before every dispatch.
    confirmation: {
      askUser: 'always',
      getConfirmation: async ({ toolParams, context }) =>
        buildDispatchConfirmation(
          {
            action: 'scan',
            params: {
              hostName: toolParams.hostName as string | undefined,
              agentId: toolParams.agentId as string | undefined,
            },
            context,
            endpointAppContextService,
            requiredPrivilege: 'canWriteScanOperations',
          },
          {
            title: 'Run malware scan?',
            color: 'warning',
            confirmText: 'Run scan',
            comment: toolParams.comment as string | undefined,
            describe: (host) =>
              `This will scan \`${
                (toolParams.path as string) ?? 'the specified path'
              }\` on ${host} for malware.`,
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
        const path = params.path as string;
        const comment = params.comment as string | undefined;

        const prepared = await prepareDispatch({
          action: 'scan',
          params: { hostName: requestedHostName, agentId: requestedAgentId },
          context,
          endpointAppContextService,
          requiredPrivilege: 'canWriteScanOperations',
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
          // `scan` per agent type/action-type combination (see
          // is_response_action_supported.ts); `manual` is what a human
          // confirming in chat maps to.
          isAutomated: false,
        });

        dispatchAttempted = true;
        const dispatchedAction = await responseActionsClient.scan(
          {
            endpoint_ids: endpointIds,
            comment: buildResponseActionComment(
              `Malware scan requested via AI agent: ${hostName}`,
              runContext,
              comment
            ),
            parameters: { path },
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
                action: 'scan' as const,
                hostName,
                found: true,
                path,
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
        return dispatchErrorResult('scanning host', error, { dispatchAttempted });
      }
    },
  };
};
