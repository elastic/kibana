/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, INTERNAL_API_ACCESS, PND_INVESTIGATIONS_URL } from '@kbn/pnd-common';
import type { ListInvestigationsResponse } from '@kbn/pnd-common';
import { MOCK_INVESTIGATIONS } from '@kbn/pnd-common';
import { PND_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';
import { realInvestigations } from './real_data';

export const registerListInvestigationsRoute = ({
  router,
  logger,
  config,
  getInvestigationStore,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PND_INVESTIGATIONS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
      },
      summary: 'List PND investigations',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {},
        },
      },
      async (context, _request, response) => {
        try {
          if (config.ui.useMockData) {
            const body: ListInvestigationsResponse = {
              investigations: MOCK_INVESTIGATIONS,
              total: MOCK_INVESTIGATIONS.length,
            };
            return response.ok({ body });
          }

          const store = getInvestigationStore();
          if (store != null) {
            const esClient = (await context.core).elasticsearch.client.asCurrentUser;
            const body = await store.listInvestigations(esClient);
            return response.ok({ body });
          }

          // Store not yet initialized — fall back to the seed data so the API
          // stays available during the brief window before start() completes.
          const body: ListInvestigationsResponse = {
            investigations: realInvestigations,
            total: realInvestigations.length,
          };
          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to list investigations: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list investigations' },
          });
        }
      }
    );
};
