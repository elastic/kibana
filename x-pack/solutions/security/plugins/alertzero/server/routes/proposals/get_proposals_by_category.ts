/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiPrivileges } from '@kbn/core-security-server';
import { z } from '@kbn/zod/v4';
import {
  API_VERSIONS,
  ALERTZERO_PROPOSALS_CATEGORY_URL,
  INTERNAL_API_ACCESS,
} from '@kbn/alertzero-common';
import { proposalCategorySchema } from '@kbn/agentic-investigations-plugin/common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { ALERTZERO_API_PRIVILEGE_READ } from '../../../common/constants';
import type { ProposalsPageResponse } from '../../../common/proposals/list';
import type { RouteDependencies } from '../register_routes';

// PROPOSALS_API_PRIVILEGE_READ cannot be imported from agentic_investigations/server (cross-plugin
// server import is forbidden), so we derive the identical value here. It is load-bearing: the
// ProposalsService reads as asInternalUser, so authz is enforced only at this layer.
const PROPOSALS_API_PRIVILEGE_READ = ApiPrivileges.read('proposals');

const GetProposalsByCategoryParams = z.object({
  category: proposalCategorySchema,
});

const GetProposalsByCategoryQuery = z.object({
  size: z.coerce.number().int().min(1).max(100).default(10),
  from: z.coerce.number().int().min(0).max(9900).default(0),
});

export const registerGetProposalsByCategoryRoute = ({
  router,
  logger,
  getSpaceId,
  getConversationProposalsService,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: ALERTZERO_PROPOSALS_CATEGORY_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_READ, PROPOSALS_API_PRIVILEGE_READ],
        },
      },
      summary: 'Get pending proposals for a single action category',
      description: 'Returns pending proposals in the given category, sorted newest first.',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetProposalsByCategoryParams),
            query: buildRouteValidationWithZod(GetProposalsByCategoryQuery),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const { category } = request.params;
          const { size, from } = request.query;

          const body: ProposalsPageResponse =
            await getConversationProposalsService().listByCategory(
              category,
              request,
              getSpaceId(request),
              { size, from }
            );

          return response.ok({ body });
        } catch (error) {
          logger.error(
            error instanceof Error ? error : `Failed to get proposals by category: ${error}`
          );
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get proposals by category' },
          });
        }
      }
    );
};
