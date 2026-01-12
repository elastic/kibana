/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { APP_ID } from '../../../../common/constants';
import { API_VERSIONS } from '../../../../common/entity_analytics/constants';
import { ENDPOINT_ASSETS_ROUTES } from '../../../../common/endpoint_assets';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { createEndpointAssetsService } from '../endpoint_assets_service';

/**
 * Register routes for Endpoint Assets transform management.
 *
 * These routes allow initialization, starting, stopping, and status checking
 * of the Osquery-to-Endpoint-Assets transform.
 */
export const registerEndpointAssetsRoutes = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  // POST /api/endpoint_assets/transform/init - Initialize transform and index
  router.versioned
    .post({
      access: 'public',
      path: `${ENDPOINT_ASSETS_ROUTES.TRANSFORM_STATUS}/init`,
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

          await service.initializeTransform();
          await service.startTransform();

          const status = await service.getTransformStatus();

          return response.ok({
            body: {
              success: true,
              message: 'Transform initialized and started successfully',
              status,
            },
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error initializing endpoint assets transform: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );

  // POST /api/endpoint_assets/transform/start - Start transform
  router.versioned
    .post({
      access: 'public',
      path: ENDPOINT_ASSETS_ROUTES.TRANSFORM_START,
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

          await service.startTransform();
          const status = await service.getTransformStatus();

          return response.ok({
            body: {
              success: true,
              message: 'Transform started successfully',
              status,
            },
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error starting endpoint assets transform: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );

  // POST /api/endpoint_assets/transform/stop - Stop transform
  router.versioned
    .post({
      access: 'public',
      path: ENDPOINT_ASSETS_ROUTES.TRANSFORM_STOP,
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

          await service.stopTransformService();
          const status = await service.getTransformStatus();

          return response.ok({
            body: {
              success: true,
              message: 'Transform stopped successfully',
              status,
            },
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error stopping endpoint assets transform: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );

  // GET /api/endpoint_assets/transform/status - Get transform status
  router.versioned
    .get({
      access: 'public',
      path: ENDPOINT_ASSETS_ROUTES.TRANSFORM_STATUS,
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

          const status = await service.getTransformStatus();

          return response.ok({
            body: status,
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error getting endpoint assets transform status: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
