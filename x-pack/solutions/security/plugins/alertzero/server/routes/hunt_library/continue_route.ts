/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ApiPrivileges } from '@kbn/core-security-server';
import { API_VERSIONS, INTERNAL_API_ACCESS } from '@kbn/alertzero-common';
import { ALERTZERO_API_PRIVILEGE_READ, HUNT_LIBRARY_URL } from '../../../common/constants';
import { continueHuntSession, HuntContinueError } from '../../hunt_library/continue_session';
import { ALERTZERO_TELEMETRY_EVENTS } from '../../telemetry/constants';
import type { RouteDependencies } from '../register_routes';
import { withAlertZeroEnabled } from '../with_alertzero_enabled';

/**
 * Reopens a hunt from an Investigation: returns the Discover state to restore and the Hunt session
 * linked to that Investigation. Needs AlertZero Read and `manage_investigations`, like preserving.
 */
export const registerHuntContinueRoute = ({
  router,
  logger,
  getSpaceId,
  getWorkflowsManagement,
  getAgentBuilderConversations,
  getAgentBuilderAttachments,
  reportTelemetryEvent,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: `${HUNT_LIBRARY_URL}/session/continue`,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [
            ALERTZERO_API_PRIVILEGE_READ,
            ApiPrivileges.manage('investigations'),
          ],
        },
      },
      summary: 'Continue a hunt in Discover from an Investigation',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: schema.object({
              investigation_id: schema.string({ minLength: 1, maxLength: 256 }),
            }),
          },
        },
      },
      withAlertZeroEnabled(async (_context, request, response) => {
        const management = getWorkflowsManagement();
        if (!management) {
          return response.customError({
            statusCode: 503,
            body: { message: 'Workflows are not available' },
          });
        }

        try {
          const body = await continueHuntSession({
            management,
            request,
            conversations: await getAgentBuilderConversations().getScopedClient({ request }),
            attachments: await getAgentBuilderAttachments().getScopedClient({ request }),
            logger,
            spaceId: getSpaceId(request),
            investigationId: request.body.investigation_id,
          });
          reportTelemetryEvent(ALERTZERO_TELEMETRY_EVENTS.HuntContinued, {
            hunt_id: body.definition_id,
          });
          return response.ok({ body });
        } catch (err) {
          if (err instanceof HuntContinueError) {
            const statusCode =
              err.code === 'investigation_inaccessible'
                ? 403
                : err.code === 'no_hunt_session'
                ? 404
                : 409;
            return response.customError({
              statusCode,
              body: { message: err.message, attributes: { reason: err.code } },
            });
          }
          logger.error(`Failed to continue Hunt session: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to continue the hunt' },
          });
        }
      })
    );
};
