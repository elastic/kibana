/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, HuntForThreatRequestBody, INTERNAL_API_ACCESS } from '@kbn/alertzero-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { ALERTZERO_API_PRIVILEGE_READ, HUNT_INTERNAL_ROUTE_BASE } from '../../../common/constants';
import { resolveIndexScope } from '../../services/watches/hunt/common/resolve_index_scope';
import type { HuntTechnology } from '../../services/watches/hunt/common/types';
import { huntForThreat } from '../../services/watches/hunt/tier1/hunt_for_threat';
import type { RouteDependencies } from '../register_routes';

/** `POST /internal/alertzero/threat_intel/hunt_for_threat` path (plan.md Phase 3). */
export const HUNT_FOR_THREAT_URL = `${HUNT_INTERNAL_ROUTE_BASE}/hunt_for_threat` as const;

/**
 * Runs Tier 1's deterministic search against a technology's A2-resolved
 * index scope (plan.md Phase 3). This route exists for manual/dev
 * invocation and Phase 4 debugging; the production caller is the `hunt`
 * child workflow (F5), which calls the service in-process rather than over
 * HTTP. A `blocked` scope is refused outright (409) — a missing required
 * index must never read as a clean zero-hit search
 * (hunt-watch-implementation.md:42).
 */
export const registerHuntForThreatRoute = ({ router, logger, getSpaceId }: RouteDependencies) => {
  router.versioned
    .post({
      path: HUNT_FOR_THREAT_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_READ],
        },
      },
      summary: 'Run Tier 1 deterministic hunt for a technology',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(HuntForThreatRequestBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { technology, iocs, techniques, timeRange, size } = request.body;
          const spaceId = getSpaceId(request);
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          const scope = await resolveIndexScope({
            esClient,
            technology: technology as HuntTechnology,
            spaceId,
          });

          if (scope.status === 'blocked') {
            return response.customError({
              statusCode: 409,
              body: {
                message: `Hunt index scope is blocked for ${technology}: missing required pattern(s) ${scope.missing.join(
                  ', '
                )}`,
              },
            });
          }

          const result = await huntForThreat(esClient, {
            scope,
            iocs,
            techniques,
            timeRange,
            size,
          });

          return response.ok({ body: { scope, result } });
        } catch (error) {
          logger.error(`Failed to run hunt_for_threat: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to run hunt_for_threat' },
          });
        }
      }
    );
};
