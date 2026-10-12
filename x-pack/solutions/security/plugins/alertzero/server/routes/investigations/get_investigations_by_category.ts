/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiPrivileges } from '@kbn/core-security-server';
import { z, lazySchema } from '@kbn/zod/v4';
import {
  API_VERSIONS,
  ALERTZERO_INVESTIGATIONS_CATEGORY_URL,
  INTERNAL_API_ACCESS,
} from '@kbn/alertzero-common';
import { proposalCategorySchema } from '@kbn/proposals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { ALERTZERO_API_PRIVILEGE_READ } from '../../../common/constants';
import type { InvestigationsPageResponse } from '../../../common/investigations/queue';
import {
  MAX_QUEUE_PAGE_SIZE,
  MAX_QUEUE_REACH,
  fitsQueueReach,
} from '../../../common/investigations/queue';
import type { RouteDependencies } from '../register_routes';
import { withAlertZeroEnabled } from '../with_alertzero_enabled';

// PROPOSALS_API_PRIVILEGE_READ cannot be imported from proposals/server (cross-plugin
// server import is forbidden), so we derive the identical value here. It is load-bearing: the
// ProposalsService reads as asInternalUser, so authz is enforced only at this layer.
const PROPOSALS_API_PRIVILEGE_READ = ApiPrivileges.read('proposals');

const GetInvestigationsByCategoryParams = lazySchema(() =>
  z.object({
    category: proposalCategorySchema,
  })
);

// `size: 0` is a count-only read: a collapsed accordion needs the group total
// without paying for its rows.
const GetInvestigationsByCategoryQuery = lazySchema(() =>
  z
    .object({
      size: z.coerce.number().int().min(0).max(MAX_QUEUE_PAGE_SIZE).default(10),
      from: z.coerce.number().int().min(0).max(MAX_QUEUE_REACH).default(0),
    })
    .refine(fitsQueueReach, { message: `from + size must not exceed ${MAX_QUEUE_REACH}` })
);

export const registerGetInvestigationsByCategoryRoute = ({
  router,
  logger,
  getSpaceId,
  getInvestigationQueueService,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: ALERTZERO_INVESTIGATIONS_CATEGORY_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_READ, PROPOSALS_API_PRIVILEGE_READ],
        },
      },
      summary: 'Get open investigations with pending proposals in an action category',
      description:
        'Returns open investigations with at least one pending proposal in the given category, ordered by their newest such proposal.',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetInvestigationsByCategoryParams),
            query: buildRouteValidationWithZod(GetInvestigationsByCategoryQuery),
          },
        },
      },
      withAlertZeroEnabled(async (_context, request, response) => {
        try {
          const { category } = request.params;
          const { size, from } = request.query;

          const body: InvestigationsPageResponse =
            await getInvestigationQueueService().listOpenByCategory(
              category,
              request,
              getSpaceId(request),
              { size, from }
            );

          return response.ok({ body });
        } catch (error) {
          logger.error(
            error instanceof Error ? error : `Failed to get investigations by category: ${error}`
          );
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get investigations by category' },
          });
        }
      })
    );
};
