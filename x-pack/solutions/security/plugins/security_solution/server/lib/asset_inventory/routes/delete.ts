/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { ASSET_INVENTORY_DELETE_API_PATH } from '../../../../common/api/asset_inventory/constants';
import { API_VERSIONS } from '../../../../common/constants';
import type { AssetInventoryRoutesDeps } from '../types';
import { errorInactiveFeature } from '../errors';

export const deleteAssetInventoryRoute = (
  router: AssetInventoryRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .delete({
      access: 'public',
      path: ASSET_INVENTORY_DELETE_API_PATH,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        // TODO: create validation
        validate: false,
      },

      async (context, _request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const secSol = await context.securitySolution;
          const body = await secSol.getAssetInventoryClient().delete();

          return response.ok({ body });
        } catch (e) {
          if (e instanceof Error && e.message === 'uiSetting') {
            return errorInactiveFeature(response);
          }

          logger.error('Error in DeleteEntityEngine:', e);
          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
