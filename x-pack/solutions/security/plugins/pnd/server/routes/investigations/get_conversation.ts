/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { API_VERSIONS, INTERNAL_API_ACCESS, PND_INVESTIGATION_URL_TEMPLATE } from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { PND_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';

const Params = z.object({
  id: z.string().min(1).max(256),
});

const PATH = `${PND_INVESTIGATION_URL_TEMPLATE}/conversation` as const;

/**
 * Returns the platform Agent Builder Conversation for a PND investigation, if
 * the conversation shadow-write is active. This lets the UI display the
 * threaded conversation alongside the legacy investigation detail.
 *
 * If shadow-write is disabled or no Conversation exists yet, returns 404 with
 * a clear message.
 */
export const registerGetConversationRoute = ({
  router,
  logger,
  getConversationClient,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PATH,
      access: INTERNAL_API_ACCESS,
      security: { authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] } },
      summary: 'Get the platform Conversation for an investigation',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(Params),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { id: investigationId } = request.params;

          const client = await getConversationClient?.(request);
          if (client == null) {
            return response.notFound({
              body: {
                message:
                  'Conversation integration not enabled. Enable pnd.conversationShadowWrite (and the agentBuilder plugin) to activate it.',
              },
            });
          }

          // The platform Conversation is linked to this investigation via
          // origin.external_conversation_id (stamped at shadow-write time).
          // The platform assigns its own UUID as the conversation `id`, so we
          // cannot directly `get(investigationId)` — we must list and filter
          // by origin, then fetch the full conversation (with rounds) by its
          // platform-assigned id.
          const conversations = await client.list();
          const match = conversations.find(
            (candidate) => candidate.origin?.external_conversation_id === investigationId
          );

          if (match == null) {
            return response.notFound({
              body: {
                message: 'No platform Conversation linked to this investigation.',
              },
            });
          }

          const conversation = await client.get(match.id);
          return response.ok({ body: conversation });
        } catch (error) {
          logger.error(`Failed to get conversation: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get conversation' },
          });
        }
      }
    );
};
