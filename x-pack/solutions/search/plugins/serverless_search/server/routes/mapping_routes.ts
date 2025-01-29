/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RouteDependencies } from '../plugin';
import { errorHandler } from '../utils/error_handler';

export const registerMappingRoutes = ({ logger, router }: RouteDependencies) => {
  router.get(
    {
      path: '/internal/serverless_search/mappings/{index_name}',
      validate: {
        params: schema.object({
          index_name: schema.string(),
        }),
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const mapping = await client.asCurrentUser.indices.getMapping({
        expand_wildcards: ['open'],
        index: request.params.index_name,
      });
      return response.ok({
        body: mapping[request.params.index_name],
        headers: { 'content-type': 'application/json' },
      });
    })
  );
};
