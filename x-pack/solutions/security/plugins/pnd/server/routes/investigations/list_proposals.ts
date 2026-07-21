/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { API_VERSIONS, INTERNAL_API_ACCESS, PND_INVESTIGATION_URL_TEMPLATE } from '@kbn/pnd-common';
import type { ListInvestigationProposalsResponse } from '@kbn/pnd-common';
import { getMockProposalsByInvestigationId } from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { PND_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';

const ListProposalsRequestParams = z.object({
  id: z.string().min(1).max(256),
});

const PROPOSALS_PATH = `${PND_INVESTIGATION_URL_TEMPLATE}/proposals` as const;

export const registerListInvestigationProposalsRoute = ({
  router,
  logger,
  config,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PROPOSALS_PATH,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
      },
      summary: 'List proposals for a PND investigation',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(ListProposalsRequestParams),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const { id } = request.params;

          if (config.ui.useMockData) {
            const proposals = getMockProposalsByInvestigationId(id);
            const body: ListInvestigationProposalsResponse = {
              proposals,
              total: proposals.length,
            };
            return response.ok({ body });
          }

          const body: ListInvestigationProposalsResponse = { proposals: [], total: 0 };
          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to list investigation proposals: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list investigation proposals' },
          });
        }
      }
    );
};
