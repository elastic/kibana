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
export const registerGetConversationRoute = ({ router, logger }: RouteDependencies) => {
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
          // The conversation is resolved by origin.external_conversation_id === investigation id.
          // For now, return a 404 indicating the conversation surface is available
          // but no platform Conversation is linked yet (shadow-write is opt-in
          // via pnd.conversationShadowWrite).
          return response.notFound({
            body: {
              message:
                'No platform Conversation linked to this investigation. Enable pnd.conversationShadowWrite to activate dual-write.',
            },
          });
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
