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
  PostEvaluateBody,
  PostEvaluateResponse,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import type { ElasticAssistantRequestHandlerContext } from '../../types';
import type { ConfigSchema } from '../../config_schema';

const ROUTE_HANDLER_TIMEOUT = 10 * 60 * 1000; // 10 * 60 seconds = 10 minutes

export const postEvaluateRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>,
  config?: ConfigSchema
) => {
  router.versioned
    .post({
      access: INTERNAL_API_ACCESS,
      path: ELASTIC_AI_ASSISTANT_EVALUATE_URL,
      security: {
        authz: {
          requiredPrivileges: ['elasticAssistant'],
        },
      },
      options: {
        timeout: {
          idleSocket: ROUTE_HANDLER_TIMEOUT,
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(PostEvaluateBody),
          },
          response: {
            200: {
              body: { custom: buildRouteValidationWithZod(PostEvaluateResponse) },
            },
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<PostEvaluateResponse>> => {
        const { handler } = await import('./post_evaluate_handler');
        return handler(context, request, response, config);
      }
    );
};
