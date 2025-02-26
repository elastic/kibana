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
import { checkAssetInventoryEnabled } from '../check_ui_settings';

export const enableAssetInventoryRoute = (
  router: AssetInventoryRoutesDeps['router'],
  logger: Logger,
  config: AssetInventoryRoutesDeps['config']
) => {
  router.versioned
    .post({
      access: 'public',
      path: '/api/asset_inventory/enable',
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

        if (!(await checkAssetInventoryEnabled(context, logger))) {
          return response.notFound();
        }

        try {
          const secSol = await context.securitySolution;
          const body = await secSol.getAssetInventoryClient().enable();

          return response.ok({ body });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error initializing asset inventory: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
