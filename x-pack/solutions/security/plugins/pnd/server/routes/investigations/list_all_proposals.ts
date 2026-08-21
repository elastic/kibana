/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, INTERNAL_API_ACCESS, PND_PROPOSALS_URL } from '@kbn/pnd-common';
import type { ListInvestigationProposalsResponse } from '@kbn/pnd-common';
import { PND_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';
import { realProposals } from './real_data';

export const registerListAllProposalsRoute = ({
  router,
  logger,
  config,
  getInvestigationStore,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PND_PROPOSALS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
      },
      summary: 'List all PND proposals (Brief queue)',
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
          const store = getInvestigationStore();
          if (store != null) {
            const esClient = (await context.core).elasticsearch.client.asCurrentUser;
            const body = await store.listAllProposals(esClient);
            return response.ok({ body });
          }

          // Store not yet initialized — fall back to seed data.
          // realProposals is a Record<investigationId, proposals[]>;
          // flatten into a single array for the Brief queue.
          const proposals = Object.values(realProposals).flat();
          const body: ListInvestigationProposalsResponse = {
            proposals,
            total: proposals.length,
          };
          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to list all proposals: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list all proposals' },
          });
        }
      }
    );
};
