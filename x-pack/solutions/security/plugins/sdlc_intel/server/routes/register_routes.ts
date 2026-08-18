/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter, KibanaResponseFactory, Logger } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import {
  SDLC_EPICS_ROUTE,
  SDLC_INTERNAL_API_VERSION,
  SDLC_ROADMAPS_ROUTE,
  SDLC_SYNC_STATUS_ROUTE,
  SDLC_SEED_WORKFLOWS_EXECUTIVE_DEMO_ROUTE,
  SDLC_TEAMS_ROUTE,
} from '../../common/api/constants';
import {
  fetchSyncStatus,
  getEpicsResponse,
  getRoadmapsResponse,
  getTeamsResponse,
} from '../services/sdlc_read_api_service';
import { seedSdlcWorkflowsExecutiveDemo } from '../services/sdlc_data_layer_service';

const ROUTE_SECURITY = {
  authz: {
    requiredPrivileges: ['securitySolution'],
  },
};

const optionalFilterQuerySchema = schema.object({
  roadmapId: schema.maybe(schema.string()),
  product: schema.maybe(schema.string()),
  search: schema.maybe(schema.string()),
});

const handleRouteError = ({
  logger,
  response,
  error,
  message,
}: {
  logger: Logger;
  response: KibanaResponseFactory;
  error: unknown;
  message: string;
}): IKibanaResponse<{ message: string }> => {
  logger.error(`${message}: ${error instanceof Error ? error.message : String(error)}`);
  return response.customError({
    statusCode: 500,
    body: {
      message: error instanceof Error ? error.message : message,
    },
  });
};

export const registerSdlcReadRoutes = (router: IRouter, logger: Logger): void => {
  router.versioned
    .get({
      path: SDLC_SYNC_STATUS_ROUTE,
      access: 'internal',
      security: ROUTE_SECURITY,
    })
    .addVersion({ version: SDLC_INTERNAL_API_VERSION, validate: {} }, async (context, _request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const body = await fetchSyncStatus(esClient);
        return response.ok({ body });
      } catch (error) {
        return handleRouteError({
          logger,
          response,
          error,
          message: 'Failed to fetch SDLC sync status',
        });
      }
    });

  router.versioned
    .get({
      path: SDLC_ROADMAPS_ROUTE,
      access: 'internal',
      security: ROUTE_SECURITY,
    })
    .addVersion(
      {
        version: SDLC_INTERNAL_API_VERSION,
        validate: {
          request: {
            query: optionalFilterQuerySchema,
          },
        },
      },
      async (context, request, response) => {
        try {
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const body = await getRoadmapsResponse({
            esClient,
            roadmapId: request.query.roadmapId,
            product: request.query.product,
            search: request.query.search,
          });
          return response.ok({ body });
        } catch (error) {
          return handleRouteError({
            logger,
            response,
            error,
            message: 'Failed to fetch SDLC roadmaps',
          });
        }
      }
    );

  router.versioned
    .get({
      path: SDLC_EPICS_ROUTE,
      access: 'internal',
      security: ROUTE_SECURITY,
    })
    .addVersion(
      {
        version: SDLC_INTERNAL_API_VERSION,
        validate: {
          request: {
            query: optionalFilterQuerySchema,
          },
        },
      },
      async (context, request, response) => {
        try {
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const body = await getEpicsResponse({
            esClient,
            roadmapId: request.query.roadmapId,
            product: request.query.product,
            search: request.query.search,
          });
          return response.ok({ body });
        } catch (error) {
          return handleRouteError({
            logger,
            response,
            error,
            message: 'Failed to fetch SDLC epics',
          });
        }
      }
    );

  router.versioned
    .get({
      path: SDLC_TEAMS_ROUTE,
      access: 'internal',
      security: ROUTE_SECURITY,
    })
    .addVersion({ version: SDLC_INTERNAL_API_VERSION, validate: {} }, async (context, _request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const body = await getTeamsResponse(esClient);
        return response.ok({ body });
      } catch (error) {
        return handleRouteError({
          logger,
          response,
          error,
          message: 'Failed to fetch SDLC teams dashboard data',
        });
      }
    });

  router.versioned
    .post({
      path: SDLC_SEED_WORKFLOWS_EXECUTIVE_DEMO_ROUTE,
      access: 'internal',
      security: ROUTE_SECURITY,
    })
    .addVersion({ version: SDLC_INTERNAL_API_VERSION, validate: {} }, async (context, _request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const body = await seedSdlcWorkflowsExecutiveDemo(esClient);
        return response.ok({ body });
      } catch (error) {
        return handleRouteError({
          logger,
          response,
          error,
          message: 'Failed to seed Workflows executive demo data',
        });
      }
    });
};
