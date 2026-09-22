/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  HuntReadinessRequestQuery,
  HuntReadinessResponse,
  HuntTechnology,
  INTERNAL_API_ACCESS,
} from '@kbn/alertzero-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { ALERTZERO_API_PRIVILEGE_READ, HUNT_INTERNAL_ROUTE_BASE } from '../../../common/constants';
import { resolveIndexScope } from '../../services/watches/hunt/common/resolve_index_scope';
import type { RouteDependencies } from '../register_routes';

export const HUNT_READINESS_URL = `${HUNT_INTERNAL_ROUTE_BASE}/readiness` as const;

const HUNT_TECHNOLOGIES: HuntTechnology[] = HuntTechnology.options;

/**
 * Readiness projection over `resolveIndexScope`, one entry per technology
 * (or the single requested one), for the given space. The security_solution
 * readiness route stays as-is and must not import this (one-way dependency rule).
 */
export const registerHuntReadinessRoute = ({ router, logger, getSpaceId }: RouteDependencies) => {
  router.versioned
    .get({
      path: HUNT_READINESS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_READ],
        },
      },
      summary: 'Hunt index-scope readiness per technology',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(HuntReadinessRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { technology } = request.query;
          const spaceId = getSpaceId(request);
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const technologies = technology ? [technology] : HUNT_TECHNOLOGIES;

          const body: HuntReadinessResponse = await Promise.all(
            technologies.map((tech) => resolveIndexScope({ esClient, technology: tech, spaceId }))
          );

          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to resolve hunt readiness: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to resolve hunt readiness' },
          });
        }
      }
    );
};
