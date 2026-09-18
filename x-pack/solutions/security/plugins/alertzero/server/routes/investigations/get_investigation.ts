/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { isConversationNotFoundError } from '@kbn/agent-builder-common';
import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  ALERTZERO_INVESTIGATION_URL_TEMPLATE,
} from '@kbn/alertzero-common';
import type { GetInvestigationResponse } from '@kbn/alertzero-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { getMockInvestigationById } from '@kbn/alertzero-common';
import { ALERTZERO_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';
import { conversationToInvestigation } from './helpers/conversation_to_investigation';

const GetInvestigationRequestParams = z.object({
  id: z.string().min(1).max(256),
});

export const registerGetInvestigationRoute = ({
  config,
  getConversationProposalsService,
  logger,
  router,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: ALERTZERO_INVESTIGATION_URL_TEMPLATE,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [ALERTZERO_API_PRIVILEGE_READ] },
      },
      summary: 'Get a AlertZero investigation by id',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetInvestigationRequestParams),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const { id } = request.params;

          if (config.ui.useMockData) {
            const investigation = getMockInvestigationById(id);
            if (!investigation) {
              return response.notFound({
                body: { message: `Investigation "${id}" not found` },
              });
            }
            const body: GetInvestigationResponse = { investigation };
            return response.ok({ body });
          }

          const conversation = await getConversationProposalsService().get(id, request);
          const body: GetInvestigationResponse = {
            investigation: conversationToInvestigation(conversation),
          };
          return response.ok({ body });
        } catch (error) {
          if (isConversationNotFoundError(error)) {
            return response.notFound({
              body: { message: `Investigation "${request.params.id}" not found` },
            });
          }
          logger.error(`Failed to get investigation: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get investigation' },
          });
        }
      }
    );
};
