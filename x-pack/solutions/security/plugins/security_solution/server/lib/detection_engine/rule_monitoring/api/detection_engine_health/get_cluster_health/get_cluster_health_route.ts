/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaResponseFactory } from '@kbn/core-http-server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidation } from '../../../../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../../../../routes/utils';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';

import type {
  GetClusterHealthRequest,
  GetClusterHealthResponse,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';
import {
  GET_CLUSTER_HEALTH_URL,
  GetClusterHealthRequestBody,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';
import type { IDetectionEngineHealthClient } from '../../../logic/detection_engine_health';
import { calculateHealthTimings } from '../health_timings';
import { validateGetClusterHealthRequest } from './get_cluster_health_request';

/**
 * Get health overview of the whole cluster. Scope: all detection rules in all Kibana spaces.
 * Returns:
 * - health state at the moment of the API call
 * - health stats over a specified period of time ("health interval")
 * - health stats history within the same interval in the form of a histogram
 *   (the same stats are calculated over each of the discreet sub-intervals of the whole interval)
 */
export const getClusterHealthRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .get({
      access: 'internal',
      path: GET_CLUSTER_HEALTH_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {},
      },
      async (context, request, response) => {
        return handleClusterHealthRequest({
          response,
          resolveParameters: () => validateGetClusterHealthRequest({}),
          resolveDependencies: async () => {
            const ctx = await context.resolve(['securitySolution']);
            const healthClient = ctx.securitySolution.getDetectionEngineHealthClient();
            return { healthClient };
          },
        });
      }
    );

  router.versioned
    .post({
      access: 'internal',
      path: GET_CLUSTER_HEALTH_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidation(GetClusterHealthRequestBody),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<GetClusterHealthResponse>> => {
        return handleClusterHealthRequest({
          response,
          resolveParameters: () => validateGetClusterHealthRequest(request.body),
          resolveDependencies: async () => {
            const ctx = await context.resolve(['securitySolution']);
            const healthClient = ctx.securitySolution.getDetectionEngineHealthClient();
            return { healthClient };
          },
        });
      }
    );
};

interface ClusterHealthRouteDependencies {
  healthClient: IDetectionEngineHealthClient;
}

interface HandleClusterHealthRequestArgs {
  response: KibanaResponseFactory;
  resolveParameters: () => GetClusterHealthRequest;
  resolveDependencies: () => Promise<ClusterHealthRouteDependencies>;
}

const handleClusterHealthRequest = async (args: HandleClusterHealthRequestArgs) => {
  const { response, resolveParameters, resolveDependencies } = args;
  const siemResponse = buildSiemResponse(response);

  try {
    const params = resolveParameters();
    const { healthClient } = await resolveDependencies();

    const clusterHealthParameters = { interval: params.interval };
    const clusterHealth = await healthClient.calculateClusterHealth(clusterHealthParameters);

    const responseBody: GetClusterHealthResponse = {
      timings: calculateHealthTimings(params.requestReceivedAt),
      parameters: clusterHealthParameters,
      health: {
        ...clusterHealth,
        debug: params.debug ? clusterHealth.debug : undefined,
      },
    };

    return response.ok({ body: responseBody });
  } catch (err) {
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};
