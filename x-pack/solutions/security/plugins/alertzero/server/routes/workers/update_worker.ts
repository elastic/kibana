/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { i18n } from '@kbn/i18n';
import type { KibanaRequest } from '@kbn/core/server';
import { WorkflowsManagementOperationPrivileges } from '@kbn/workflows';
import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  ALERTZERO_WORKER_URL_TEMPLATE,
  UpdateWorkerRequestBody,
} from '@kbn/alertzero-common';
import { ALERTZERO_API_PRIVILEGE_WRITE } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';
import { withAlertZeroEnabled } from '../with_alertzero_enabled';

const UpdateWorkerRequestParams = z.object({
  workerId: z.string().min(1).max(128),
});

const hasManagedWorkflowUpdatePrivilege = (request: KibanaRequest): boolean =>
  WorkflowsManagementOperationPrivileges.updateManaged.every(
    (privilege) => request.authzResult?.[privilege] === true
  );

export const registerUpdateWorkerRoute = ({
  router,
  logger,
  getSpaceId,
  getWorkersService,
}: RouteDependencies) => {
  router.versioned
    .patch({
      path: ALERTZERO_WORKER_URL_TEMPLATE,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_WRITE],
          extendedPrivileges: [...WorkflowsManagementOperationPrivileges.updateManaged],
        },
      },
      summary: 'Update a AlertZero worker and its settings',
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
      withAlertZeroEnabled(async (_context, request, response) => {
        try {
          if (request.body.enabled !== undefined && !hasManagedWorkflowUpdatePrivilege(request)) {
            return response.forbidden({
              body: {
                message: i18n.translate('xpack.alertzero.workerEnableForbiddenErrorMessage', {
                  defaultMessage:
                    'Enabling or disabling a worker requires update access to managed workflows',
                }),
              },
            });
          }

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
                  message: i18n.translate('xpack.alertzero.workerNotFoundErrorMessage', {
                    defaultMessage: 'Worker "{workerId}" not found',
                    values: { workerId },
                  }),
                },
              });
            case 'rejected':
              return response.badRequest({
                body: {
                  message: i18n.translate('xpack.alertzero.workerSettingsRejectedErrorMessage', {
                    defaultMessage: 'Cannot apply {setting} to worker "{workerId}"',
                    values: { setting: result.what, workerId },
                  }),
                },
              });
            case 'invalid':
              return response.badRequest({
                body: {
                  message: i18n.translate('xpack.alertzero.workerSettingsInvalidErrorMessage', {
                    defaultMessage: 'Invalid settings for worker "{workerId}": {details}',
                    values: { details: result.message, workerId },
                  }),
                },
              });
            case 'conflict':
              return response.conflict({
                body: {
                  message: i18n.translate(
                    'xpack.alertzero.workerSettingsConflictResponseErrorMessage',
                    {
                      defaultMessage: 'Worker "{workerId}" settings changed; reload and retry',
                      values: { workerId },
                    }
                  ),
                },
              });
            case 'unavailable':
              return response.customError({
                statusCode: 503,
                body: {
                  message: i18n.translate('xpack.alertzero.workerSettingsUnavailableErrorMessage', {
                    defaultMessage: 'Worker settings are temporarily unavailable; try again',
                  }),
                },
              });
            case 'failed':
              return response.customError({
                statusCode: 500,
                body: {
                  message: i18n.translate('xpack.alertzero.workerSettingsUnconfirmedErrorMessage', {
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
              message: i18n.translate('xpack.alertzero.workerUpdateResponseErrorMessage', {
                defaultMessage: 'Failed to update worker',
              }),
            },
          });
        }
      })
    );
};
