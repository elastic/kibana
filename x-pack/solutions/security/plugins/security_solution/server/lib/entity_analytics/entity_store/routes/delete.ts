/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';

import { EntityType } from '../../../../../common/search_strategy';
import type {
  DeleteEntityEngineResponse,
  DeleteEntityEnginesResponse,
} from '../../../../../common/api/entity_analytics/entity_store/engine/delete.gen';
import {
  DeleteEntityEngineRequestQuery,
  DeleteEntityEngineRequestParams,
  DeleteEntityEnginesRequestQuery,
} from '../../../../../common/api/entity_analytics/entity_store/engine/delete.gen';
import { API_VERSIONS, APP_ID } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { TASK_MANAGER_UNAVAILABLE_ERROR } from '../../risk_engine/routes/translations';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import { ENTITY_STORE_API_CALL_EVENT } from '../../../telemetry/event_based/events';

export const deleteEntityEngineRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  telemetry: ITelemetryEventsSender,
  logger: Logger,
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices']
) => {
  router.versioned
    .delete({
      access: 'public',
      path: '/api/entity_store/engines/{entityType}',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(DeleteEntityEngineRequestQuery),
            params: buildRouteValidationWithZod(DeleteEntityEngineRequestParams),
          },
        },
      },

      async (context, request, response): Promise<IKibanaResponse<DeleteEntityEngineResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const [_, { taskManager }] = await getStartServices();
        if (!taskManager) {
          return siemResponse.error({
            statusCode: 400,
            body: TASK_MANAGER_UNAVAILABLE_ERROR,
          });
        }

        try {
          const secSol = await context.securitySolution;
          const body = await secSol
            .getEntityStoreDataClient()
            .delete(EntityType[request.params.entityType], taskManager, {
              deleteData: !!(request.query.delete_data || request.query.data),
              deleteEngine: true,
            });
          telemetry.reportEBT(ENTITY_STORE_API_CALL_EVENT, {
            endpoint: request.route.path,
          });
          return response.ok({ body });
        } catch (e) {
          logger.error('Error in DeleteEntityEngine:', e);
          const error = transformError(e);
          telemetry.reportEBT(ENTITY_STORE_API_CALL_EVENT, {
            endpoint: request.route.path,
            error: error.message,
          });
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};

export const deleteEntityEnginesRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  telemetry: ITelemetryEventsSender,
  logger: Logger,
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices']
) => {
  router.versioned
    .delete({
      access: 'public',
      path: '/api/entity_store/engines',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
      options: {
        availability: {
          since: '9.3.0',
          stability: 'stable',
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(DeleteEntityEnginesRequestQuery),
          },
        },
      },

      async (context, request, response): Promise<IKibanaResponse<DeleteEntityEnginesResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const [_, { taskManager }] = await getStartServices();
        if (!taskManager) {
          return siemResponse.error({
            statusCode: 400,
            body: TASK_MANAGER_UNAVAILABLE_ERROR,
          });
        }

        try {
          const secSol = await context.securitySolution;
          const client = await secSol.getEntityStoreDataClient();
          let engines = request.query.entityTypes;
          if (engines === undefined || engines.length === 0) {
            engines = await client.getEnabledEntityTypes();
          }

          const deletedEngines: EntityType[] = [];
          await Promise.all(
            engines.map((e) => {
              const engine = EntityType[e];
              if (!client.isEngineRunning(engine)) {
                return Promise.resolve();
              }
              deletedEngines.push(engine);
              return client.delete(engine, taskManager, {
                deleteData: !!request.query.delete_data,
                deleteEngine: true,
              });
            })
          );

          const stillRunning = (await client.list()).engines?.map((e) => e.type);
          telemetry.reportEBT(ENTITY_STORE_API_CALL_EVENT, {
            endpoint: request.route.path,
          });
          return response.ok({
            body: {
              deleted: deletedEngines,
              still_running: stillRunning,
            },
          });
        } catch (e) {
          logger.error('Error in DeleteEntityEngines:', e);
          const error = transformError(e);
          telemetry.reportEBT(ENTITY_STORE_API_CALL_EVENT, {
            endpoint: request.route.path,
            error: error.message,
          });
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
