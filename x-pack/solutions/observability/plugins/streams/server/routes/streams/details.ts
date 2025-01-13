/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { notFound, internal } from '@hapi/boom';
import { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { createServerRoute } from '../create_server_route';
import { DefinitionNotFound } from '../../lib/streams/errors';

export interface StreamDetailsResponse {
  details: {
    count: number;
  };
}

export const streamDetailRoute = createServerRoute({
  endpoint: 'GET /api/streams/{id}/_details',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  params: z.object({
    path: z.object({ id: z.string() }),
    query: z.object({
      start: z.string(),
      end: z.string(),
    }),
  }),
  handler: async ({
    response,
    params,
    request,
    logger,
    getScopedClients,
  }): Promise<StreamDetailsResponse> => {
    try {
      const { scopedClusterClient, streamsClient } = await getScopedClients({ request });
      const streamEntity = await streamsClient.getStream(params.path.id);

      // check doc count
      const docCountResponse = await scopedClusterClient.asCurrentUser.search({
        index: streamEntity.name,
        body: {
          track_total_hits: true,
          query: {
            range: {
              '@timestamp': {
                gte: params.query.start,
                lte: params.query.end,
              },
            },
          },
          size: 0,
        },
      });

      const count = (docCountResponse.hits.total as SearchTotalHits).value;

      return {
        details: {
          count,
        },
      };
    } catch (e) {
      if (e instanceof DefinitionNotFound) {
        throw notFound(e);
      }

      throw internal(e);
    }
  },
});
