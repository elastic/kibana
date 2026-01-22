/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { APP_ID } from '../../../../../common/constants';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import { ENDPOINT_ASSETS_ROUTES } from '../../../../../common/endpoint_assets';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { createEndpointAssetsService } from '../../endpoint_assets_service';

/**
 * Register routes for Software Inventory transform management.
 */
export const registerSoftwareTransformRoutes = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  // POST /api/endpoint_assets/software/transform/init - Initialize software inventory transform
  router.versioned
    .post({
      access: 'public',
      path: ENDPOINT_ASSETS_ROUTES.SOFTWARE_TRANSFORM_INIT,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
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

        try {
          const coreContext = await context.core;
          const secSol = await context.securitySolution;

          const service = createEndpointAssetsService({
            esClient: coreContext.elasticsearch.client.asCurrentUser,
            soClient: coreContext.savedObjects.client,
            logger,
            namespace: secSol.getSpaceId(),
          });

          await service.initializeSoftwareInventoryInfrastructure();
          await service.startSoftwareInventoryTransform();

          const status = await service.getSoftwareInventoryTransformStatus();

          return response.ok({
            body: {
              success: true,
              message: 'Software inventory transform initialized and started successfully',
              status,
            },
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error initializing software inventory transform: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );

  // POST /api/endpoint_assets/software/transform/start - Start software inventory transform
  router.versioned
    .post({
      access: 'public',
      path: ENDPOINT_ASSETS_ROUTES.SOFTWARE_TRANSFORM_START,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
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

        try {
          const coreContext = await context.core;
          const secSol = await context.securitySolution;

          const service = createEndpointAssetsService({
            esClient: coreContext.elasticsearch.client.asCurrentUser,
            soClient: coreContext.savedObjects.client,
            logger,
            namespace: secSol.getSpaceId(),
          });

          await service.startSoftwareInventoryTransform();
          const status = await service.getSoftwareInventoryTransformStatus();

          return response.ok({
            body: {
              success: true,
              message: 'Software inventory transform started successfully',
              status,
            },
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error starting software inventory transform: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );

  // POST /api/endpoint_assets/software/transform/stop - Stop software inventory transform
  router.versioned
    .post({
      access: 'public',
      path: ENDPOINT_ASSETS_ROUTES.SOFTWARE_TRANSFORM_STOP,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
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

        try {
          const coreContext = await context.core;
          const secSol = await context.securitySolution;

          const service = createEndpointAssetsService({
            esClient: coreContext.elasticsearch.client.asCurrentUser,
            soClient: coreContext.savedObjects.client,
            logger,
            namespace: secSol.getSpaceId(),
          });

          await service.stopSoftwareInventoryTransform();
          const status = await service.getSoftwareInventoryTransformStatus();

          return response.ok({
            body: {
              success: true,
              message: 'Software inventory transform stopped successfully',
              status,
            },
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error stopping software inventory transform: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );

  // GET /api/endpoint_assets/software/transform/status - Get software inventory transform status
  router.versioned
    .get({
      access: 'public',
      path: ENDPOINT_ASSETS_ROUTES.SOFTWARE_TRANSFORM_STATUS,
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

        try {
          const coreContext = await context.core;
          const secSol = await context.securitySolution;

          const service = createEndpointAssetsService({
            esClient: coreContext.elasticsearch.client.asCurrentUser,
            soClient: coreContext.savedObjects.client,
            logger,
            namespace: secSol.getSpaceId(),
          });

          const status = await service.getSoftwareInventoryTransformStatus();

          return response.ok({
            body: status,
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error getting software inventory transform status: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
