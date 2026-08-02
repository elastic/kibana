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
  buildWatchAutonomyUiSettingKey,
  GetAutonomyRequestQuery,
} from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { PND_API_PRIVILEGE_READ } from '../../../../common/constants';
import type { RouteDependencies } from '../../register_routes';
import { asWatchAutonomyLevel } from '../../../lib/as_watch_autonomy_level';
import { buildAutonomyResponse } from '../../../lib/build_autonomy_response';
import { getScopedInternalUiSettingsClient } from '../../../lib/scoped_internal_ui_settings_client';
import { isSystemSecurityWatchId } from '../../../lib/is_system_security_watch_id';

/**
 * `GET /internal/pnd/autonomy` — the orchestrators' read path.
 *
 * Gated on the narrowest PND privilege ({@link PND_API_PRIVILEGE_READ}) so the
 * Task Manager API key that drives the watch (which carries the scheduling
 * user's privileges, NOT the autonomy-write privilege) can still read the dial.
 * The level is read as the internal user, space-scoped to the request.
 */
export const registerGetAutonomyRoute = ({
  router,
  logger,
  getSpaceId,
  getStartServices,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PND_AUTONOMY_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
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

        // Security finding S4: allow-list the watchId BEFORE building the key.
        if (!isSystemSecurityWatchId(watchId)) {
          return response.badRequest({
            body: { message: `Unknown watchId "${watchId}"` },
          });
        }

        try {
          const [{ savedObjects, uiSettings }] = await getStartServices();
          const spaceId = getSpaceId(request);
          const uiSettingsClient = getScopedInternalUiSettingsClient({
            savedObjects,
            spaceId,
            uiSettings,
          });

          // Narrowed rather than trusted: the uiSettings `schema` bounds every write, but a space
          // seeded before the scale became a name can still hold an ordinal, and that must read as
          // no autonomy rather than clamp up to Supervised.
          const autonomyLevel = asWatchAutonomyLevel(
            await uiSettingsClient.get<unknown>(buildWatchAutonomyUiSettingKey(watchId))
          );

          return response.ok({ body: buildAutonomyResponse(watchId, autonomyLevel) });
        } catch (error) {
          logger.error(`Failed to get autonomy for watch "${watchId}": ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get autonomy' },
          });
        }
      }
    );
};
