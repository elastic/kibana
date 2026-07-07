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
import { escapeKuery } from '@kbn/es-query';

import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { ISOLATE_TOOL_ID } from '../..';
import {
  buildResponseActionComment,
  insufficientPrivilegesResult,
  resolveAgentTypeFromPackages,
} from '../types';

const isolateHostSchema = z.object({
  hostName: z.string().min(1).describe('The hostname of the endpoint to isolate.'),
  comment: z
    .string()
    .min(1)
    .optional()
    .describe('An optional comment explaining why the host is being isolated.'),
});

export const isolateHostTool = (
  endpointAppContextService: EndpointAppContextService
): BuiltinSkillBoundedTool => {
  return {
    id: ISOLATE_TOOL_ID,
    type: ToolType.builtin,
    description: `Isolates a host by its hostname. Isolation disconnects the endpoint from the network to contain a potential threat. The action is dispatched through the Elastic Defend Response Actions service.`,
    schema: isolateHostSchema,
    // HITL gate enforced by the framework, not skill prose: the runner prompts
    // the analyst for confirmation before every dispatch. `always` (not `once`)
    // so each host isolation is confirmed individually.
    confirmation: {
      askUser: 'always',
      getConfirmation: ({ toolParams }) => ({
        title: 'Isolate host?',
        message: `This will disconnect **${
          (toolParams.hostName as string) ?? 'the host'
        }** from the network. Only Elastic Defend will retain connectivity.`,
        color: 'danger',
        confirm_text: 'Isolate host',
      }),
    },
    handler: async (params, { logger, request, runContext, spaceId }) => {
      try {
        const hostName = params.hostName as string;
        const comment = params.comment as string | undefined;

        // The internal response-actions client runs as an automated, unsecured
        // client and skips the per-user privilege checks the HTTP route enforces
        // via `withEndpointAuthz({ all: ['canIsolateHost'] })`. Assert the
        // caller's privilege here so reaching the skill via chat cannot bypass
        // endpoint RBAC.
        const authz = await endpointAppContextService.getEndpointAuthz(request);
        if (!authz.canIsolateHost) {
          return insufficientPrivilegesResult('canIsolateHost');
        }

        // The response actions API needs endpoint_ids, not host names.
        // We resolve hostName -> endpoint_ids via the fleet agent service.
        // `hostName` is user/LLM-controlled, so escape it before interpolating
        // into the KQL expression. This lookup also drives multi-vendor
        // support: the agent's installed packages tell us which EDR
        // (`agentType`) to dispatch through, the same way the REST API's
        // `agent_type` request field does.
        const fleetServices = endpointAppContextService.getInternalFleetServices(spaceId);
        const agent = fleetServices.agent;
        const agents = await agent.listAgents({
          showInactive: true,
          kuery: `local_metadata.host.name: ${escapeKuery(hostName)}`,
          page: 1,
          perPage: 1,
        });

        if (!agents?.agents?.length) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
                data: {
                  hostName,
                  found: false,
                  reason: 'endpoint_not_found' as const,
                  message: `No endpoint found with hostname '${hostName}'.`,
                },
              },
            ],
          };
        }

        const endpointIds = agents.agents.map((a) => a.id);
        const agentType = resolveAgentTypeFromPackages(agents.agents[0].packages);

        // Reject hosts that live in a different space than the caller's active
        // space — resolving/dispatching against the default space's agents would
        // otherwise let a caller act on hosts outside their space.
        await fleetServices.ensureInCurrentSpace({ agentIds: endpointIds });

        // Attribute the action to the initiating analyst (falls back to the
        // default system user when the current user cannot be resolved) so the
        // Response Actions audit trail records who requested it, not `elastic`.
        const username = endpointAppContextService.getCurrentUsername(request);
        const responseActionsClient = endpointAppContextService.getInternalResponseActionsClient({
          spaceId,
          username,
          agentType,
          // Analyst-initiated via chat (gated behind HITL confirmation), not a
          // system/rule-triggered action — RESPONSE_ACTIONS_SUPPORT_MAP gates
          // `isolate` per agent type/action-type combination (see
          // is_response_action_supported.ts); `manual` is what a human
          // confirming in chat maps to.
          isAutomated: false,
        });

        const actionDetails = await responseActionsClient.isolate(
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

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
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
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: `Error isolating host: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };
};
