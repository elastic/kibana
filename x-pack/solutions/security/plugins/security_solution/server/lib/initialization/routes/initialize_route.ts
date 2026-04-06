/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import {
  INITIALIZE_SECURITY_SOLUTION_URL,
  INITIALIZE_SECURITY_SOLUTION_SOCKET_TIMEOUT_MS,
  InitializeSecuritySolutionRequestBody,
} from '../../../../common/api/initialization';
import type { InitializeSecuritySolutionResponse } from '../../../../common/api/initialization';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { buildSiemResponse } from '../../detection_engine/routes/utils';
import { runInitializationFlows } from '../flow_registry';

export const initializeRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .post({
      access: 'public',
      path: INITIALIZE_SECURITY_SOLUTION_URL,
      options: {
        timeout: {
          idleSocket: INITIALIZE_SECURITY_SOLUTION_SOCKET_TIMEOUT_MS,
        },
      },
      security: {
        authz: {
          enabled: false,
          reason: 'Space initialization flows should not require user privileges',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidationWithZod(InitializeSecuritySolutionRequestBody),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<InitializeSecuritySolutionResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const results = await runInitializationFlows(
            request.body.flows,
            {
              requestHandlerContext: context,
            },
            logger
          );

          return response.ok({ body: results });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
