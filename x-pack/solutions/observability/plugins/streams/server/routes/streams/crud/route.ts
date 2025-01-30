/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import {
  isGroupStreamDefinition,
  StreamDefinition,
  StreamGetResponse,
  streamUpsertRequestSchema,
} from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { UpsertStreamResponse } from '../../../lib/streams/client';
import { createServerRoute } from '../../create_server_route';
import { readStream } from './read_stream';

export const readStreamRoute = createServerRoute({
  endpoint: 'GET /api/streams/{id}',
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
  }),
  handler: async ({ params, request, getScopedClients }): Promise<StreamGetResponse> => {
    const { assetClient, streamsClient, scopedClusterClient } = await getScopedClients({
      request,
    });

    const body = await readStream({
      name: params.path.id,
      assetClient,
      scopedClusterClient,
      streamsClient,
    });

    return body;
  },
});

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
  handler: async ({ params, request, getScopedClients }): Promise<StreamDetailsResponse> => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });
    const streamEntity = await streamsClient.getStream(params.path.id);

    const indexPattern = isGroupStreamDefinition(streamEntity)
      ? streamEntity.group.members.join(',')
      : streamEntity.name;
    // check doc count
    const docCountResponse = await scopedClusterClient.asCurrentUser.search({
      index: indexPattern,
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
  },
});

export const listStreamsRoute = createServerRoute({
  endpoint: 'GET /api/streams',
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
  params: z.object({}),
  handler: async ({ request, getScopedClients }): Promise<{ streams: StreamDefinition[] }> => {
    const { streamsClient } = await getScopedClients({ request });
    return {
      streams: await streamsClient.listStreams(),
    };
  },
});

export const editStreamRoute = createServerRoute({
  endpoint: 'PUT /api/streams/{id}',
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
    path: z.object({
      id: z.string(),
    }),
    body: streamUpsertRequestSchema,
  }),
  handler: async ({ params, request, getScopedClients }): Promise<UpsertStreamResponse> => {
    const { streamsClient } = await getScopedClients({ request });
    return await streamsClient.upsertStream({
      request: params.body,
      name: params.path.id,
    });
  },
});

export const deleteStreamRoute = createServerRoute({
  endpoint: 'DELETE /api/streams/{id}',
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
    path: z.object({
      id: z.string(),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<{ acknowledged: true }> => {
    const { streamsClient } = await getScopedClients({
      request,
    });

    return await streamsClient.deleteStream(params.path.id);
  },
});

export const crudRoutes = {
  ...readStreamRoute,
  ...streamDetailRoute,
  ...listStreamsRoute,
  ...editStreamRoute,
  ...deleteStreamRoute,
};
