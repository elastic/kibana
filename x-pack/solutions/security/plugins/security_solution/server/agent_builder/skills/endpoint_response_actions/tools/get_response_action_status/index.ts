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
import { NotFoundError } from '../../../../../endpoint/errors';
import { getActionDetailsById } from '../../../../../endpoint/services/actions';
import { GET_RESPONSE_ACTION_STATUS_TOOL_ID } from '../..';
import {
  insufficientPrivilegesResult,
  responseActionErrorResult,
  summarizeActionErrors,
  summarizeActionHosts,
  summarizeActionOutputs,
  summarizeActionParameters,
  summarizeAgentState,
} from '../types';

const getResponseActionStatusSchema = z.object({
  actionId: z
    .string()
    .uuid()
    .describe(
      'Any known response-action ID — from a prior action mentioned in this conversation or from Response Actions history in the UI.'
    ),
});

/**
 * Read-only lookup of a previously dispatched response action by its action ID.
 * Mirrors `GET /api/endpoint/action/{action_id}`. Inspects any action from
 * Response Actions history; it cannot dispatch or modify actions.
 */
export const getResponseActionStatusTool = (
  endpointAppContextService: EndpointAppContextService
): BuiltinSkillBoundedTool<typeof getResponseActionStatusSchema> => {
  return {
    id: GET_RESPONSE_ACTION_STATUS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Retrieves the current status and outputs of a previously dispatched endpoint response action by its action ID. Use this read-only lookup when the analyst asks about a prior isolate, release, scan, or running-processes action — especially when the original dispatch returned pending.',
    schema: getResponseActionStatusSchema,
    handler: async (params, { logger, request, spaceId }) => {
      try {
        const actionId = params.actionId;

        // The HTTP details route gates this behind
        // `withEndpointAuthz({ all: ['canAccessEndpointActionsLogManagement'] })`.
        // The internal lookup skips that check, so assert the caller's privilege
        // here to keep chat access from bypassing endpoint RBAC.
        const authz = await endpointAppContextService.getEndpointAuthz(request);
        if (!authz.canAccessEndpointActionsLogManagement) {
          return insufficientPrivilegesResult('canAccessEndpointActionsLogManagement');
        }

        // Build request-scoped services so these reads fan out across linked
        // projects under CPS. `getActionDetailsById` documents `scoped` as
        // required for that: without it the read is origin-only and an action
        // from a linked project is reported as `action_not_found` even though
        // Response Actions history shows it.
        const scoped = await endpointAppContextService.asScoped(request);

        const actionDetails = await getActionDetailsById(
          endpointAppContextService,
          spaceId,
          actionId,
          { scoped }
        );

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                kind: 'response_action_result' as const,
                found: true,
                actionId: actionDetails.id,
                command: actionDetails.command,
                status: actionDetails.status,
                wasSuccessful: actionDetails.wasSuccessful,
                isCompleted: actionDetails.isCompleted,
                wasCanceled: actionDetails.wasCanceled,
                // `getActionStatus` maps an action that never completed and
                // passed its expiration to `status: 'failed'` — the same status
                // as a genuine command failure. `isExpired` is the only field
                // that tells them apart, and an expired action usually has no
                // `errors` either, so without it the agent reports "failed" and
                // then has no reason to give. The analyst's next step differs
                // completely: a failure is investigated, an expired action is
                // simply re-issued.
                isExpired: actionDetails.isExpired,
                // Bounded: a fan-out action carries one entry per targeted
                // host, so a batch isolate would otherwise inject thousands of
                // host records into the model context. The total is reported
                // alongside the bounded sample.
                ...(summarizeActionHosts(actionDetails.hosts) ?? {}),
                // Bounded: `parameters` is a flat bag but its VALUES are not
                // small — a CrowdStrike `runscript` permits a 65,536-character
                // `raw` script plus an 8,192-character `commandLine`, so
                // forwarding it verbatim injects tens of thousands of
                // characters into the conversation on every status poll.
                // Bounded like `hosts`; the paths shortened are reported.
                ...(summarizeActionParameters(actionDetails.parameters) ?? {}),
                // Bounded: raw `outputs` can carry multi-MB command output and
                // one entry per process. Summarized so a single lookup cannot
                // exhaust the conversation context.
                outputs: summarizeActionOutputs(actionDetails.outputs),
                // Per-agent completion. The aggregate `status`/`wasSuccessful`
                // fields cannot say WHICH host of a fan-out finished, which is
                // exactly what `agentState` carries. Bounded like `hosts`.
                ...(summarizeAgentState(actionDetails.agentState) ?? {}),
                // Documented on ActionDetails: the error reason(s) when
                // `wasSuccessful` is false. Bounded like `hosts`/`agentState`:
                // a failed fan-out aggregates one error list per agent, so the
                // raw array is unbounded even though the other fields are not.
                ...(summarizeActionErrors(actionDetails.errors) ?? {}),
                startedAt: actionDetails.startedAt,
                completedAt: actionDetails.completedAt,
                createdBy: actionDetails.createdBy,
                comment: actionDetails.comment,
                agentType: actionDetails.agentType,
              },
            },
          ],
        };
      } catch (error) {
        if (error instanceof NotFoundError) {
          const actionId = params.actionId;
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
                data: {
                  kind: 'response_action_result' as const,
                  found: false,
                  reason: 'action_not_found' as const,
                  actionId,
                  message: `No response action found with id '${actionId}'.`,
                },
              },
            ],
          };
        }

        logger.error(error);
        return responseActionErrorResult(
          'unknown_error',
          `Error retrieving response action status: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    },
  };
};
