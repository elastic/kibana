/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';

export const GET_INFERENCE_ENDPOINTS_PATH = '/internal/workplace_ai/inference_endpoints';

export function registerGetInferenceEndpointsRoute(router: IRouter) {
  router.get(
    {
      path: GET_INFERENCE_ENDPOINTS_PATH,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {},
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const esClient = coreContext.elasticsearch.client.asCurrentUser;

      const { endpoints } = await esClient.inference.get({
        inference_id: '_all',
      });

      return response.ok({
        body: {
          inference_endpoints: endpoints,
        },
      });
    }
  );
}
