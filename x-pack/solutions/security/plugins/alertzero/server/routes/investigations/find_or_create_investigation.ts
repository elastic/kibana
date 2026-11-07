/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindOrCreateWorkerInvestigationResponse } from '@kbn/alertzero-common';
import {
  ALERTZERO_FIND_OR_CREATE_INVESTIGATION_URL,
  API_VERSIONS,
  FindOrCreateWorkerInvestigationRequestBody,
  INTERNAL_API_ACCESS,
} from '@kbn/alertzero-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { ALERTZERO_API_PRIVILEGE_WRITE } from '../../../common/constants';
import { runFindOrCreateWorkerInvestigation } from '../../services/investigations/find_or_create_worker_investigation';
import {
  ALERTZERO_TELEMETRY_EVENTS,
  buildWorkerInvestigationReopenedPayload,
} from '../../telemetry';
import type { RouteDependencies } from '../register_routes';
import { withAlertZeroEnabled } from '../with_alertzero_enabled';

/**
 * Mints or verifies the one Investigation a Detection Watch review keeps per subject. The
 * review workflows cannot compute the deterministic id (a uuidv5), so they call this instead
 * of `ai.conversation.create`, which would open a new Investigation on every re-review.
 */
export const registerFindOrCreateWorkerInvestigationRoute = ({
  router,
  logger,
  getSpaceId,
  getAgentBuilderConversations,
  reportTelemetryEvent,
}: RouteDependencies): void => {
  router.versioned
    .post({
      path: ALERTZERO_FIND_OR_CREATE_INVESTIGATION_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_WRITE],
        },
      },
      summary: 'Find or create a Worker Investigation',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(FindOrCreateWorkerInvestigationRequestBody),
          },
        },
      },
      withAlertZeroEnabled(async (context, request, response) => {
        try {
          const spaceId = getSpaceId(request);
          const conversations = getAgentBuilderConversations();
          const conversationClient = await conversations.getScopedClient({ request });

          const { workerId, subjectId, title, description, workflowExecutionId } = request.body;

          const body: FindOrCreateWorkerInvestigationResponse =
            await runFindOrCreateWorkerInvestigation(
              { spaceId, workerId, subjectId, title, description, workflowExecutionId },
              {
                conversationClient,
                logger,
                // The reopen is reported as the Worker the body names. The route does not
                // verify its caller; the body's `workerId` is an enum of the review Workers.
                onReopened: (investigationId) =>
                  reportTelemetryEvent(
                    ALERTZERO_TELEMETRY_EVENTS.WorkerInvestigationReopened,
                    buildWorkerInvestigationReopenedPayload({
                      investigationId,
                      spaceId,
                      workerId,
                    })
                  ),
              }
            );
          return response.ok({ body });
        } catch (err) {
          logger.error(`investigations/find_or_create route failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Find-or-create Investigation failed' },
          });
        }
      })
    );
};
