/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { API_VERSIONS, INTERNAL_API_ACCESS } from '@kbn/alertzero-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { ALERTZERO_API_PRIVILEGE_READ, HUNT_INTERNAL_ROUTE_BASE } from '../../../common/constants';
import { resolveIndexScope } from '../../services/watches/hunt/common/resolve_index_scope';
import type { HuntTechnology } from '../../services/watches/hunt/common/types';
import type { RouteDependencies } from '../register_routes';

/** `GET /internal/alertzero/threat_intel/readiness` path (plan.md:249). */
export const HUNT_READINESS_URL = `${HUNT_INTERNAL_ROUTE_BASE}/readiness` as const;

const HUNT_TECHNOLOGIES: HuntTechnology[] = ['aws_iam', 'fortigate'];

const ReadinessRequestQuery = z.object({
  technology: z.enum(['aws_iam', 'fortigate']).optional(),
});

/**
 * Readiness projection over A2's `resolveIndexScope`, one entry per
 * technology (or the single requested one), for the given space. This is a
 * thin projection over the resolution service, not a duplicate of its
 * logic (plan.md:249) — the security_solution readiness route stays as-is
 * and must not import this (buildout.md:31, one-way dependency rule).
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
            query: buildRouteValidationWithZod(ReadinessRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { technology } = request.query;
          const spaceId = getSpaceId(request);
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const technologies = technology ? [technology] : HUNT_TECHNOLOGIES;

          const body = await Promise.all(
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
