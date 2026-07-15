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
import { insufficientPrivilegesResult, responseActionErrorResult } from '../types';

const getResponseActionStatusSchema = z.object({
  actionId: z
    .string()
    .uuid()
    .describe(
      'The response action ID to look up. Use the action ID returned by a prior isolate, release, scan, or running-processes action in this conversation.'
    ),
});

/**
 * Read-only lookup for a previously dispatched response action by its action ID.
 * Mirrors `GET /api/endpoint/action/{action_id}` and is the follow-up path when
 * a write action returned `pending` because the host had not finished yet.
 */
export const getResponseActionStatusTool = (
  endpointAppContextService: EndpointAppContextService
): BuiltinSkillBoundedTool => {
  return {
    id: GET_RESPONSE_ACTION_STATUS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Retrieves the current status and outputs of a previously dispatched endpoint response action by its action ID. Use this read-only lookup when the analyst asks about a prior isolate, release, scan, or running-processes action — especially when the original dispatch returned pending.',
    schema: getResponseActionStatusSchema,
    handler: async (params, { logger, request, spaceId }) => {
      try {
        const actionId = params.actionId as string;

        // The HTTP details route gates this behind
        // `withEndpointAuthz({ all: ['canAccessEndpointActionsLogManagement'] })`.
        // The internal lookup skips that check, so assert the caller's privilege
        // here to keep chat access from bypassing endpoint RBAC.
        const authz = await endpointAppContextService.getEndpointAuthz(request);
        if (!authz.canAccessEndpointActionsLogManagement) {
          return insufficientPrivilegesResult('canAccessEndpointActionsLogManagement');
        }

        const actionDetails = await getActionDetailsById(
          endpointAppContextService,
          spaceId,
          actionId
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
                hosts: actionDetails.hosts,
                parameters: actionDetails.parameters,
                outputs: actionDetails.outputs,
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
          const actionId = params.actionId as string;
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
