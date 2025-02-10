/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';
import { fetchInferenceEndpoints } from './lib/fetch_inference_endpoints';
import { APIRoutes } from './types';
import { errorHandler } from './utils/error_handler';
import { deleteInferenceEndpoint } from './lib/delete_inference_endpoint';

export function defineRoutes({ logger, router }: { logger: Logger; router: IRouter }) {
  router.get(
    {
      path: APIRoutes.GET_INFERENCE_ENDPOINTS,
      validate: {},
    },
    errorHandler(logger)(async (context, request, response) => {
      const {
        client: { asCurrentUser },
      } = (await context.core).elasticsearch;

      const { inferenceEndpoints } = await fetchInferenceEndpoints(asCurrentUser);

      return response.ok({
        body: {
          inference_endpoints: inferenceEndpoints,
        },
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.delete(
    {
      path: APIRoutes.INFERENCE_ENDPOINT,
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.string(),
        }),
        query: schema.object({
          scanUsage: schema.maybe(schema.boolean()),
        }),
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const {
        client: { asCurrentUser },
      } = (await context.core).elasticsearch;

      const { type, id } = request.params;
      const { scanUsage } = request.query;
      const result = await deleteInferenceEndpoint(asCurrentUser, type, id, scanUsage ?? false);

      return response.ok({ body: result });
    })
  );
}
