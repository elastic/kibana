/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { API_VERSIONS, INTERNAL_API_ACCESS, PND_INVESTIGATION_URL_TEMPLATE } from '@kbn/pnd-common';
import type { GetInvestigationResponse } from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { getMockInvestigationById } from '@kbn/pnd-common';
import { PND_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';
import { getRealInvestigationById } from './real_data';

const GetInvestigationRequestParams = z.object({
  id: z.string().min(1).max(256),
});

export const registerGetInvestigationRoute = ({
  router,
  logger,
  config,
  getInvestigationStore,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PND_INVESTIGATION_URL_TEMPLATE,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
      },
      summary: 'Get a PND investigation by id',
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
      async (context, request, response) => {
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

          const store = getInvestigationStore();
          const investigation =
            store != null
              ? await store.getInvestigation(
                  (
                    await context.core
                  ).elasticsearch.client.asCurrentUser,
                  id
                )
              : getRealInvestigationById(id);

          if (!investigation) {
            return response.notFound({
              body: { message: `Investigation "${id}" not found` },
            });
          }
          const body: GetInvestigationResponse = { investigation };
          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to get investigation: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get investigation' },
          });
        }
      }
    );
};
