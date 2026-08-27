/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { i18n } from '@kbn/i18n';
import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  PND_WATCH_URL_TEMPLATE,
  UpdateWatchRequestBody,
} from '@kbn/pnd-common';
import { PND_API_PRIVILEGE_WRITE } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';
import { storeUnavailableResponse } from '../store_route_guard';

const UpdateWatchRequestParams = z.object({
  watchId: z.string().min(1).max(128),
});

export const registerUpdateWatchRoute = ({
  router,
  logger,
  getSpaceId,
  getWatchesService,
}: RouteDependencies) => {
  router.versioned
    .patch({
      path: PND_WATCH_URL_TEMPLATE,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [PND_API_PRIVILEGE_WRITE],
        },
      },
      summary: 'Update a PND watch and its settings',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(UpdateWatchRequestParams),
            body: buildRouteValidationWithZod(UpdateWatchRequestBody),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const { watchId } = request.params;
          const result = await getWatchesService().update(
            watchId,
            request.body,
            getSpaceId(request),
            request
          );

          switch (result.outcome) {
            case 'updated':
              return response.ok({ body: result.response });
            case 'not-found':
              return response.notFound({
                body: {
                  message: i18n.translate('xpack.pnd.watchNotFoundErrorMessage', {
                    defaultMessage: 'Watch "{watchId}" not found',
                    values: { watchId },
                  }),
                },
              });
            case 'rejected':
              return response.badRequest({
                body: {
                  message: i18n.translate('xpack.pnd.watchSettingsRejectedErrorMessage', {
                    defaultMessage: 'Cannot apply {setting} to watch "{watchId}"',
                    values: { setting: result.what, watchId },
                  }),
                },
              });
            case 'conflict':
              return response.conflict({
                body: {
                  message: i18n.translate('xpack.pnd.watchSettingsConflictResponseErrorMessage', {
                    defaultMessage: 'Watch "{watchId}" settings changed; reload and retry',
                    values: { watchId },
                  }),
                },
              });
            case 'unavailable':
              return storeUnavailableResponse(response);
            case 'failed':
              return response.customError({
                statusCode: 500,
                body: {
                  message: i18n.translate('xpack.pnd.watchSettingsUnconfirmedErrorMessage', {
                    defaultMessage: 'Watch settings could not be confirmed after save',
                  }),
                },
              });
          }
        } catch (error) {
          logger.error(`Failed to update watch: ${error}`);
          return response.customError({
            statusCode: 500,
            body: {
              message: i18n.translate('xpack.pnd.watchUpdateResponseErrorMessage', {
                defaultMessage: 'Failed to update watch',
              }),
            },
          });
        }
      }
    );
};
