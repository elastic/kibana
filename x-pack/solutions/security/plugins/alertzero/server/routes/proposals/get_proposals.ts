/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiPrivileges } from '@kbn/core-security-server';
import type { z } from '@kbn/zod/v4';
import { API_VERSIONS, ALERTZERO_PROPOSALS_URL, INTERNAL_API_ACCESS } from '@kbn/alertzero-common';
import { proposalsQuerySchema } from '@kbn/agentic-investigations-plugin/common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { ALERTZERO_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';

// PROPOSALS_API_PRIVILEGE_READ cannot be imported from agentic_investigations/server (cross-plugin
// server import is forbidden), so we derive the identical value here. It is load-bearing: the
// ProposalsService reads as asInternalUser, so authz is enforced only at this layer.
const PROPOSALS_API_PRIVILEGE_READ = ApiPrivileges.read('proposals');

const GetProposalsRequestQuery = proposalsQuerySchema;
type GetProposalsRequestQuery = z.infer<typeof GetProposalsRequestQuery>;

export const registerGetProposalsRoute = ({
  router,
  logger,
  getSpaceId,
  getConversationProposalsService,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: ALERTZERO_PROPOSALS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_READ, PROPOSALS_API_PRIVILEGE_READ],
        },
      },
      summary: 'Get proposals grouped by category',
      description:
        'Returns all pending proposals plus proposals decided within the window, grouped by action category.',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: { query: buildRouteValidationWithZod(GetProposalsRequestQuery) },
        },
      },
      async (_context, request, response) => {
        try {
          const body = await getConversationProposalsService().list(
            request.query,
            request,
            getSpaceId(request)
          );
          return response.ok({ body });
        } catch (error) {
          logger.error(error instanceof Error ? error : `Failed to get proposals: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get proposals' },
          });
        }
      }
    );
};
