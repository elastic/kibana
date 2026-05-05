/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { Logger } from '@kbn/core/server';
import { SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING } from '@kbn/management-settings-ids';
import { ENTITY_LATEST, getEntitiesAlias } from '@kbn/entity-store/common';
import { ASSET_INVENTORY_INSTALL_DATA_VIEW_API_PATH } from '../../../../common/api/asset_inventory/constants';
import { API_VERSIONS } from '../../../../common/constants';
import type { AssetInventoryRoutesDeps } from '../types';
import { errorInactiveFeature } from '../errors';
import { installDataView } from '../saved_objects/data_view';
import { ASSET_INVENTORY_DATA_VIEW_ID_PREFIX, ASSET_INVENTORY_DATA_VIEW_NAME } from '../constants';

export const installAssetInventoryDataViewRoute = (
  router: AssetInventoryRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'public',
      path: ASSET_INVENTORY_INSTALL_DATA_VIEW_API_PATH,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {},
        },
      },

      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const secSol = await context.securitySolution;
          const uiSettingsClient = secSol.core.uiSettings.client;
          const isAssetInventoryEnabled = await uiSettingsClient.get<boolean>(
            SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING
          );

          if (!isAssetInventoryEnabled) {
            return errorInactiveFeature(response);
          }

          const spaceId = secSol.getSpaceId();
          const dataViewService = secSol.getDataViewsService();
          const dataViewId = `${ASSET_INVENTORY_DATA_VIEW_ID_PREFIX}-${spaceId}`;
          const expectedIndexPattern = getEntitiesAlias(ENTITY_LATEST, spaceId);

          let existingDataView;
          try {
            existingDataView = await dataViewService.get(dataViewId, false);
          } catch (error) {
            if (
              error &&
              typeof error === 'object' &&
              'output' in error &&
              error.output &&
              typeof error.output === 'object' &&
              'statusCode' in error.output &&
              error.output.statusCode === 404
            ) {
              logger.info(
                `DataView with ID '${dataViewId}' not found. Proceeding with installation.`
              );
            } else {
              logger.error(
                'An unexpected error occurred while checking data view existence:',
                error
              );
            }
          }

          // Migration path for users coming from Entity Store v1: the data view id is the same
          // but the underlying title used to be the v1 internal index pattern. Detect the stale
          // title and recreate against the v2 alias so the page reads the correct indices.
          if (existingDataView) {
            if (existingDataView.title === expectedIndexPattern) {
              logger.debug('DataView is already installed. Skipping installation.');
              return response.ok({ body: undefined });
            }
            logger.info(
              `DataView '${dataViewId}' has stale title '${existingDataView.title}'; recreating against '${expectedIndexPattern}'.`
            );
            await dataViewService.delete(dataViewId);
          }

          const body = await installDataView(
            spaceId,
            dataViewService,
            ASSET_INVENTORY_DATA_VIEW_NAME,
            expectedIndexPattern,
            dataViewId,
            logger
          );

          return response.ok({ body });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error installing asset inventory data view: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
