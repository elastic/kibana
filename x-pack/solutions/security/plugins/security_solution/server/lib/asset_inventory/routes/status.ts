/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { Logger } from '@kbn/core/server';
import { API_VERSIONS } from '../../../../common/constants';

import type { AssetInventoryRoutesDeps } from '../types';
import { getEntityStorePrivileges } from '../../entity_analytics/entity_store/utils/get_entity_store_privileges';

export const statusAssetInventoryRoute = (
  router: AssetInventoryRoutesDeps['router'],
  logger: Logger,
  getStartServices: AssetInventoryRoutesDeps['getStartServices']
) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/asset_inventory/status',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: false,
      },

      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        const secSol = await context.securitySolution;

        try {
          const [_, { security }] = await getStartServices();

          const entityStorePrivileges = await getEntityStorePrivileges(request, security, []);

          const body = await secSol.getAssetInventoryClient().status(secSol, entityStorePrivileges);

          return response.ok({ body });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error retrieving Asset Inventory status: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
