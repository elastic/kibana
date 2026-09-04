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
  PND_WORKER_URL_TEMPLATE,
  UpdateWorkerRequestBody,
} from '@kbn/pnd-common';
import { PND_API_PRIVILEGE_WRITE } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';

const UpdateWorkerRequestParams = z.object({
  workerId: z.string().min(1).max(128),
});

export const registerUpdateWorkerRoute = ({
  router,
  logger,
  getSpaceId,
  getWorkersService,
}: RouteDependencies) => {
  router.versioned
    .patch({
      path: PND_WORKER_URL_TEMPLATE,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [PND_API_PRIVILEGE_WRITE],
        },
      },
      summary: 'Update a PND worker and its settings',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(UpdateWorkerRequestParams),
            body: buildRouteValidationWithZod(UpdateWorkerRequestBody),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const { workerId } = request.params;
          const result = await getWorkersService().update(
            workerId,
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
                  message: i18n.translate('xpack.pnd.workerNotFoundErrorMessage', {
                    defaultMessage: 'Worker "{workerId}" not found',
                    values: { workerId },
                  }),
                },
              });
            case 'rejected':
              return response.badRequest({
                body: {
                  message: i18n.translate('xpack.pnd.workerSettingsRejectedErrorMessage', {
                    defaultMessage: 'Cannot apply {setting} to worker "{workerId}"',
                    values: { setting: result.what, workerId },
                  }),
                },
              });
            case 'conflict':
              return response.conflict({
                body: {
                  message: i18n.translate('xpack.pnd.workerSettingsConflictResponseErrorMessage', {
                    defaultMessage: 'Worker "{workerId}" settings changed; reload and retry',
                    values: { workerId },
                  }),
                },
              });
            case 'unavailable':
              return response.customError({
                statusCode: 503,
                body: {
                  message: i18n.translate('xpack.pnd.workerSettingsUnavailableErrorMessage', {
                    defaultMessage: 'Worker settings are temporarily unavailable; try again',
                  }),
                },
              });
            case 'failed':
              return response.customError({
                statusCode: 500,
                body: {
                  message: i18n.translate('xpack.pnd.workerSettingsUnconfirmedErrorMessage', {
                    defaultMessage: 'Worker settings could not be confirmed after save',
                  }),
                },
              });
          }
        } catch (error) {
          logger.error(`Failed to update worker: ${error}`);
          return response.customError({
            statusCode: 500,
            body: {
              message: i18n.translate('xpack.pnd.workerUpdateResponseErrorMessage', {
                defaultMessage: 'Failed to update worker',
              }),
            },
          });
        }
      }
    );
};
