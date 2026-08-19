/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SynchronizeSpaceEnablementResponse } from '@kbn/pnd-common';
import { i18n } from '@kbn/i18n';
import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  PND_API_PRIVILEGE_WRITE,
  PND_SPACE_ENABLED_SETTING_ID,
  PND_SPACE_ENABLEMENT_SYNC_URL,
} from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';

export const registerSynchronizeSpaceEnablementRoute = ({
  router,
  logger,
  getSpaceId,
  getWatchesService,
}: RouteDependencies): void => {
  router.versioned
    .post({
      path: PND_SPACE_ENABLEMENT_SYNC_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [PND_API_PRIVILEGE_WRITE],
        },
      },
      summary: 'Synchronize PND watches with space enablement',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: { request: {} },
      },
      async (context, request, response) => {
        try {
          const core = await context.core;
          const enabled = await core.uiSettings.client.get<boolean>(PND_SPACE_ENABLED_SETTING_ID);
          await getWatchesService().synchronizeSpaceEnabled(enabled, getSpaceId(request), request);
          const body: SynchronizeSpaceEnablementResponse = { enabled };
          return response.ok({ body });
        } catch (error) {
          logger.error(
            `Failed to synchronize PND space enablement: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          return response.customError({
            statusCode: 500,
            body: {
              message: i18n.translate('xpack.pnd.spaceEnablementSyncResponseErrorMessage', {
                defaultMessage: 'Failed to synchronize PND space enablement',
              }),
            },
          });
        }
      }
    );
};
