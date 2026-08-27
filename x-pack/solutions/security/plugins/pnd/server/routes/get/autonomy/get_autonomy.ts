/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  PND_AUTONOMY_URL,
  GetAutonomyRequestQuery,
} from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { RouteDependencies } from '../../register_routes';
import { asWatchAutonomyLevel } from '../../../lib/as_watch_autonomy_level';
import { buildAutonomyResponse } from '../../../lib/build_autonomy_response';
import { isSystemSecurityWatchId } from '../../../lib/is_system_security_watch_id';
import { httpStatusFromWatchError } from '../../../services/watches/workflows_read_authz';
import { getWatchRouteAuthz } from '../../watches/watch_route_security';

/**
 * `GET /internal/pnd/autonomy` — the dial UI's read path.
 *
 * YAML no longer calls this route; autonomy is evaluated at approval time. The
 * handler still re-reads via `get()`, which asserts Workflows managed-read from
 * `request.authzResult`, so live authz is the same pair as the watch catalog
 * ({@link getWatchRouteAuthz}). Mock mode stays on PND-read only. An uninstalled
 * watch returns the default `manual` without installing.
 */
export const registerGetAutonomyRoute = ({
  config,
  getSpaceId,
  getWatchesService,
  logger,
  router,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PND_AUTONOMY_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: getWatchRouteAuthz(config.ui.useMockData),
      },
      summary: "Get a PND watch's autonomy level",
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(GetAutonomyRequestQuery),
          },
        },
      },
      async (_context, request, response) => {
        const { watchId } = request.query;

        // Security finding S4: allow-list the watchId BEFORE reading settings.
        if (!isSystemSecurityWatchId(watchId)) {
          return response.badRequest({
            body: { message: `Unknown watchId "${watchId}"` },
          });
        }

        try {
          const spaceId = getSpaceId(request);
          const current = await getWatchesService().get(watchId, spaceId, request);
          const autonomyLevel = asWatchAutonomyLevel(current?.settings?.autonomy);

          return response.ok({ body: buildAutonomyResponse(watchId, autonomyLevel) });
        } catch (error) {
          logger.error(`Failed to get autonomy for watch "${watchId}": ${error}`);
          return response.customError({
            statusCode: httpStatusFromWatchError(error),
            body: { message: 'Failed to get autonomy' },
          });
        }
      }
    );
};
