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
  SetAutonomyRequestBody,
} from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { PND_API_PRIVILEGE_AUTONOMY_WRITE } from '../../../../common/constants';
import type { RouteDependencies } from '../../register_routes';
import { isWatchAutonomyLevel } from '../../../lib/as_watch_autonomy_level';
import { buildAutonomyResponse } from '../../../lib/build_autonomy_response';
import { isSystemSecurityWatchId } from '../../../lib/is_system_security_watch_id';

/**
 * `PUT /internal/pnd/autonomy` — the operator write path.
 *
 * Gated on the dedicated {@link PND_API_PRIVILEGE_AUTONOMY_WRITE} privilege
 * (grantable independently of `pnd all`). Writes the per-space template value
 * (install-on-save, without enabling). Must not go through `PATCH /watches`,
 * which lacks this privilege.
 */
export const registerPutAutonomyRoute = ({
  router,
  logger,
  getSpaceId,
  getWatchesService,
}: RouteDependencies) => {
  router.versioned
    .put({
      path: PND_AUTONOMY_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PND_API_PRIVILEGE_AUTONOMY_WRITE] },
      },
      summary: "Set a PND watch's autonomy level",
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(SetAutonomyRequestBody),
          },
        },
      },
      async (_context, request, response) => {
        const { autonomyLevel, watchId } = request.body;

        // Security finding S4: allow-list the watchId and re-validate the level
        // BEFORE writing template values.
        if (!isSystemSecurityWatchId(watchId)) {
          return response.badRequest({
            body: { message: `Unknown watchId "${watchId}"` },
          });
        }

        if (!isWatchAutonomyLevel(autonomyLevel)) {
          return response.badRequest({
            body: { message: `Invalid autonomy level "${autonomyLevel}"` },
          });
        }

        try {
          const spaceId = getSpaceId(request);
          const service = getWatchesService();
          const current = await service.get(watchId, spaceId, request);
          const result = await service.update(
            watchId,
            { autonomyLevel, settingsRevision: current?.settingsRevision ?? null },
            spaceId,
            request
          );

          if (result.outcome === 'updated') {
            return response.ok({ body: buildAutonomyResponse(watchId, autonomyLevel) });
          }

          if (result.outcome === 'conflict') {
            return response.conflict({
              body: { message: 'Watch settings changed; reload and retry' },
            });
          }

          logger.error(`Failed to set autonomy for watch "${watchId}": ${result.outcome}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to set autonomy' },
          });
        } catch (error) {
          logger.error(`Failed to set autonomy for watch "${watchId}": ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to set autonomy' },
          });
        }
      }
    );
};
