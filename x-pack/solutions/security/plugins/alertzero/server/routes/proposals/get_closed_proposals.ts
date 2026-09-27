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
  ALERTZERO_PROPOSALS_CLOSED_URL,
  INTERNAL_API_ACCESS,
} from '@kbn/alertzero-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { ALERTZERO_API_PRIVILEGE_READ } from '../../../common/constants';
import type { ProposalsPageResponse } from '../../../common/proposals/list';
import {
  MAX_QUEUE_PAGE_SIZE,
  MAX_QUEUE_REACH,
  fitsQueueReach,
} from '../../../common/proposals/list';
import type { RouteDependencies } from '../register_routes';
import { withAlertZeroEnabled } from '../with_alertzero_enabled';

// PROPOSALS_API_PRIVILEGE_READ cannot be imported from proposals/server (cross-plugin
// server import is forbidden), so we derive the identical value here. It is load-bearing: the
// ProposalsService reads as asInternalUser, so authz is enforced only at this layer.
const PROPOSALS_API_PRIVILEGE_READ = ApiPrivileges.read('proposals');

// `size: 0` is a count-only read: a collapsed accordion needs the group total
// without paying for its rows.
const GetClosedProposalsQuery = z
  .object({
    size: z.coerce.number().int().min(0).max(MAX_QUEUE_PAGE_SIZE).default(25),
    from: z.coerce.number().int().min(0).max(MAX_QUEUE_REACH).default(0),
  })
  .refine(fitsQueueReach, { message: `from + size must not exceed ${MAX_QUEUE_REACH}` });

export const registerGetClosedProposalsRoute = ({
  router,
  logger,
  getSpaceId,
  getConversationProposalsService,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: ALERTZERO_PROPOSALS_CLOSED_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_READ, PROPOSALS_API_PRIVILEGE_READ],
        },
      },
      summary: 'Get proposals decided in the last 72 hours',
      description:
        'Returns proposals that stopped awaiting a human decision in the last 72 h, including expired ones. Sorted by decidedAt desc.',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(GetClosedProposalsQuery),
          },
        },
      },
      withAlertZeroEnabled(async (_context, request, response) => {
        try {
          const { size, from } = request.query;

          const body: ProposalsPageResponse = await getConversationProposalsService().listClosed(
            request,
            getSpaceId(request),
            { size, from }
          );

          return response.ok({ body });
        } catch (error) {
          logger.error(error instanceof Error ? error : `Failed to get closed proposals: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get closed proposals' },
          });
        }
      })
    );
};
