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
  endpointNotFoundData,
  insufficientPrivilegesResult,
  MAX_ACTION_COMMENT_LENGTH,
  MAX_FILE_PATH_LENGTH,
  MAX_HOSTNAME_LENGTH,
  responseActionErrorResult,
  waitForActionCompletion,
} from '../types';
import { createEndpointLookupService } from '../services/endpoint_lookup';

const scanHostSchema = z.object({
  hostName: z
    .string()
    .min(1)
    .max(MAX_HOSTNAME_LENGTH)
    .describe('The hostname of the endpoint to scan for malware.'),
  path: z
    .string()
    .min(1)
    .max(MAX_FILE_PATH_LENGTH)
    .describe('The absolute file or folder path on the endpoint to scan for malware.'),
  comment: z
    .string()
    .min(1)
    .max(MAX_ACTION_COMMENT_LENGTH)
    .optional()
    .describe('An optional comment explaining why the scan is being performed.'),
});

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
    description: `Scans a file or folder path on a host for malware using the endpoint's existing Elastic Defend policy. The action is dispatched through the Elastic Defend Response Actions service. Requires explicit analyst confirmation before dispatch.`,
    schema: scanHostSchema,
    // HITL gate enforced by the framework, not skill prose: the runner prompts
    // the analyst for confirmation before every dispatch.
    confirmation: {
      askUser: 'always',
      getConfirmation: ({ toolParams }) => ({
        title: 'Run malware scan?',
        message: `This will scan \`${(toolParams.path as string) ?? 'the specified path'}\` on **${
          (toolParams.hostName as string) ?? 'the host'
        }** for malware.`,
        color: 'warning',
        confirm_text: 'Run scan',
      }),
    },
    handler: async (params, { logger, request, runContext, spaceId }) => {
      try {
        const hostName = params.hostName as string;
        const path = params.path as string;
        const comment = params.comment as string | undefined;

        // The internal response-actions client runs as an automated, unsecured
        // client and skips the per-user privilege checks the HTTP route enforces
        // via `withEndpointAuthz({ all: ['canWriteScanOperations'] })`. Assert
        // the caller's privilege here so reaching the skill via chat cannot
        // bypass endpoint RBAC.
        const authz = await endpointAppContextService.getEndpointAuthz(request);
        if (!authz.canWriteScanOperations) {
          return insufficientPrivilegesResult('canWriteScanOperations');
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
                  action: 'scan' as const,
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
          // Analyst-initiated via chat (gated behind HITL confirmation), not a
          // system/rule-triggered action — RESPONSE_ACTIONS_SUPPORT_MAP gates
          // `scan` per agent type/action-type combination (see
          // is_response_action_supported.ts); `manual` is what a human
          // confirming in chat maps to.
          isAutomated: false,
        });

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
          logger
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
                hosts: actionDetails.hosts,
                comment,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(error);
        return responseActionErrorResult(
          'unknown_error',
          `Error scanning host: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
  };
};
