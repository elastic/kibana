/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { createRouteValidationFunction } from '@kbn/io-ts-utils';
import {
  GetInfraMetricsRequestBodyPayloadRT,
  GetInfraMetricsRequestParamsRT,
  GetInfraMetricsResponsePayloadRT,
} from '../../../common/http_api/infra';
import {
  GetInfraAssetCountRequestBodyPayloadRT,
  GetInfraAssetCountResponsePayloadRT,
  GetInfraAssetCountRequestParamsPayloadRT,
} from '../../../common/http_api/asset_count_api';
import type { InfraBackendLibs } from '../../lib/infra_types';
import { getInfraAlertsClient } from '../../lib/helpers/get_infra_alerts_client';
import { getHosts } from './lib/host/get_hosts';
import { getHostsCount } from './lib/host/get_hosts_count';
import { getInfraMetricsClient } from '../../lib/helpers/get_infra_metrics_client';
import { getApmDataAccessClient } from '../../lib/helpers/get_apm_data_access_client';

export const initInfraAssetRoutes = (libs: InfraBackendLibs) => {
  const { framework } = libs;

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/metrics/infra/{assetType}',
      validate: {
        body: createRouteValidationFunction(GetInfraMetricsRequestBodyPayloadRT),
        params: createRouteValidationFunction(GetInfraMetricsRequestParamsRT),
      },
    },
    async (context, request, response) => {
      const { from, to, metrics, limit, query } = request.body;

      try {
        const apmDataAccessClient = getApmDataAccessClient({ request, libs, context });

        const [infraMetricsClient, alertsClient, apmDataAccessServices] = await Promise.all([
          getInfraMetricsClient({ request, libs, context }),
          getInfraAlertsClient({ libs, request }),
          apmDataAccessClient.getServices(),
        ]);

        const hosts = await getHosts({
          from,
          to,
          metrics,
          limit,
          query,
          alertsClient,
          infraMetricsClient,
          apmDataAccessServices,
        });

        return response.ok({
          body: GetInfraMetricsResponsePayloadRT.encode(hosts),
        });
      } catch (err) {
        if (Boom.isBoom(err)) {
          return response.customError({
            statusCode: err.output.statusCode,
            body: { message: err.output.payload.message },
          });
        }

        return response.customError({
          statusCode: err.statusCode ?? 500,
          body: {
            message: err.message ?? 'An unexpected error occurred',
          },
        });
      }
    }
  );

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/infra/{assetType}/count',
      validate: {
        body: createRouteValidationFunction(GetInfraAssetCountRequestBodyPayloadRT),
        params: createRouteValidationFunction(GetInfraAssetCountRequestParamsPayloadRT),
      },
    },
    async (context, request, response) => {
      const { body, params } = request;
      const { assetType } = params;
      const { query, from, to } = body;

      try {
        const apmDataAccessClient = getApmDataAccessClient({ request, libs, context });

        const [infraMetricsClient, apmDataAccessServices] = await Promise.all([
          getInfraMetricsClient({ request, libs, context }),
          apmDataAccessClient.getServices(),
        ]);

        const count = await getHostsCount({
          infraMetricsClient,
          apmDataAccessServices,
          query,
          from,
          to,
        });

        return response.ok({
          body: GetInfraAssetCountResponsePayloadRT.encode({
            assetType,
            count,
          }),
        });
      } catch (err) {
        if (Boom.isBoom(err)) {
          return response.customError({
            statusCode: err.output.statusCode,
            body: { message: err.output.payload.message },
          });
        }

        return response.customError({
          statusCode: err.statusCode ?? 500,
          body: {
            message: err.message ?? 'An unexpected error occurred',
          },
        });
      }
    }
  );
};
