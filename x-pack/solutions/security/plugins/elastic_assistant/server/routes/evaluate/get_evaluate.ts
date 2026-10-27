/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, IKibanaResponse } from '@kbn/core/server';

import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_EVALUATE_URL,
  INTERNAL_API_ACCESS,
  GetEvaluateResponse,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import type { ElasticAssistantRequestHandlerContext } from '../../types';

export const getEvaluateRoute = (router: IRouter<ElasticAssistantRequestHandlerContext>) => {
  router.versioned
    .get({
      access: INTERNAL_API_ACCESS,
      path: ELASTIC_AI_ASSISTANT_EVALUATE_URL,
      security: {
        authz: {
          requiredPrivileges: ['elasticAssistant'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          response: {
            200: {
              body: { custom: buildRouteValidationWithZod(GetEvaluateResponse) },
            },
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<GetEvaluateResponse>> => {
        const { handler } = await import('./get_evaluate_handler');
        return handler(context, request, response);
      }
    );
};
