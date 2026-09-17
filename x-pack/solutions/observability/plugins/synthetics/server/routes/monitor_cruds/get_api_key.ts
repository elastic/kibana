/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import type { SecurityCreateApiKeyResponse } from '@elastic/elasticsearch/lib/api/types';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { jsonArrayFromString, queryBoolean, routeId } from '../zod_query';
import { ELASTIC_MANAGED_LOCATIONS_DISABLED } from './project_monitor/add_monitor_project';
import type { SyntheticsRestApiRouteFactory } from '../types';
import { generateProjectAPIKey } from '../../synthetics_service/get_api_key';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export interface ProjectAPIKeyResponse {
  apiKey: SecurityCreateApiKeyResponse | null;
}

export const getAPIKeySyntheticsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.SYNTHETICS_PROJECT_APIKEY,
  validate: {
    query: z.object({
      spaces: jsonArrayFromString(routeId, 100).optional(),
      accessToElasticManagedLocations: queryBoolean.optional(),
    }),
  },
  handler: async ({
    request,
    server,
    response,
  }): Promise<ProjectAPIKeyResponse | IKibanaResponse> => {
    const { accessToElasticManagedLocations, spaces } = request.query;

    if (accessToElasticManagedLocations) {
      const elasticManagedLocationsEnabled =
        Boolean(
          (
            await server.coreStart?.capabilities.resolveCapabilities(request, {
              capabilityPath: 'uptime.*',
            })
          ).uptime.elasticManagedLocationsEnabled
        ) ?? true;
      if (!elasticManagedLocationsEnabled) {
        return response.customError({
          body: { message: ELASTIC_MANAGED_LOCATIONS_DISABLED },
          statusCode: 403,
        });
      }
    }

    const apiKey = await generateProjectAPIKey({
      request,
      server,
      accessToElasticManagedLocations,
      spaces,
    });

    return { apiKey };
  },
});
