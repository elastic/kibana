/* eslint-disable @kbn/eslint/require-license-header */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { IKibanaResponse, Logger } from '@kbn/core/server';

import type { MonitoringEntitySourceResponse } from '../../../../../common/api/entity_analytics/privilege_monitoring/monitoring_entity_source/monitoring_entity_source.gen';
import { API_VERSIONS, APP_ID } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { MonitoringEntitySourceSyncDataClient } from '../monitoring_entity_source_sync_data_client';
import { MonitoringEntitySourceDescriptor } from '../../../../../common/api/entity_analytics/privilege_monitoring/monitoring_entity_source/monitoring_entity_source.gen';

export const monitoringEntitySourceSyncRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  config: EntityAnalyticsRoutesDeps['config']
) => {
  router.versioned
    .post({
      access: 'public',
      path: '/api/entity_analytics/monitoring/entity_source',
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
            body: MonitoringEntitySourceDescriptor,
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<MonitoringEntitySourceResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const coreContext = await context.core;
          const soClient = coreContext.savedObjects.client;
          const clusterClient = coreContext.elasticsearch.client;

          const dataClient = new MonitoringEntitySourceSyncDataClient({
            soClient,
            clusterClient,
            logger,
            namespace: 'default',
          });

          const result = await dataClient.init(request.body);

          return response.ok({ body: result });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error creating monitoring entity source sync config: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
  router.versioned
    .get({
      access: 'public',
      path: '/api/entity_analytics/monitoring/entity_source',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {},
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<MonitoringEntitySourceResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const coreContext = await context.core;
          const soClient = coreContext.savedObjects.client;
          const clusterClient = coreContext.elasticsearch.client;

          const dataClient = new MonitoringEntitySourceSyncDataClient({
            soClient,
            clusterClient,
            logger,
            namespace: 'default',
          });

          const result = await dataClient.get();
          return response.ok({ body: result });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error getting monitoring entity source sync config: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
