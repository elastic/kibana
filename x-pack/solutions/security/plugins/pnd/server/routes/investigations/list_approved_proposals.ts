/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, INTERNAL_API_ACCESS, PND_INVESTIGATIONS_URL } from '@kbn/pnd-common';
import type { ListInvestigationProposalsResponse } from '@kbn/pnd-common';
import { PND_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';
import { realProposals } from './real_data';

const PATH = `${PND_INVESTIGATIONS_URL}/proposals/approved` as const;
const MAX_RESULTS = 20;

/**
 * Returns proposals with status 'approved', sorted by decidedAt descending
 * (most recent first). Limited to 20 results for the Brief page's
 * "Recently Approved" section for post-approval monitoring.
 */
export const registerListApprovedProposalsRoute = ({
  router,
  logger,
  getInvestigationStore,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PATH,
      access: INTERNAL_API_ACCESS,
      security: { authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] } },
      summary: 'List recently approved proposals',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: { request: {} },
      },
      async (context, _request, response) => {
        try {
          const store = getInvestigationStore();
          if (store != null) {
            const esClient = (await context.core).elasticsearch.client.asCurrentUser;
            const body = await store.listApprovedProposals(esClient);
            return response.ok({ body });
          }

          // Store not initialized — fall back to seed data (same pattern as
          // list_all_proposals). Filter for approved proposals and sort by
          // decidedAt descending to match the ES-backed query's ordering.
          const approved = Object.values(realProposals)
            .flat()
            .filter((p) => p.status === 'approved')
            .sort((a, b) => {
              const aTime = a.decidedAt ? new Date(a.decidedAt).getTime() : 0;
              const bTime = b.decidedAt ? new Date(b.decidedAt).getTime() : 0;
              return bTime - aTime;
            })
            .slice(0, MAX_RESULTS);

          const body: ListInvestigationProposalsResponse = {
            proposals: approved,
            total: approved.length,
          };
          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to list approved proposals: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list approved proposals' },
          });
        }
      }
    );
};
