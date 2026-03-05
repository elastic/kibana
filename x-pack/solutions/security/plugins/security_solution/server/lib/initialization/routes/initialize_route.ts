/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  INITIALIZE_SECURITY_SOLUTION_URL,
  InitializeSecuritySolutionRequestBody,
} from '../../../../common/api/initialization';
import type { InitializeSecuritySolutionResponse } from '../../../../common/api/initialization';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { buildSiemResponse } from '../../detection_engine/routes/utils';
import type { InitializationFlowRunner } from '../flow_registry';

export const initializeRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  flowRegistry: InitializationFlowRunner
) => {
  router.versioned
    .post({
      access: 'internal',
      path: INITIALIZE_SECURITY_SOLUTION_URL,
      security: {
        authz: {
          enabled: false,
          reason: "Space initialization endpoints should not require user privileges",
        },
      },
    })
    .addVersion(
      {
        version: '1',
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
          const results = await flowRegistry.run(request.body.flows, {
            requestHandlerContext: context,
            logger,
          });

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
