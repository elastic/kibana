/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { badRequest, internal, notFound } from '@hapi/boom';
import { isResponseError } from '@kbn/es-errors';
import {
  StreamDefinition,
  StreamGetResponse,
  streamUpsertRequestSchema,
} from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import {
  DefinitionNotFound,
  ForkConditionMissing,
  IndexTemplateNotFound,
  RootStreamImmutabilityException,
  SecurityException,
} from '../../../lib/streams/errors';
import { MalformedStreamId } from '../../../lib/streams/errors/malformed_stream_id';
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
    try {
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
    } catch (e) {
      if (e instanceof DefinitionNotFound || (isResponseError(e) && e.statusCode === 404)) {
        throw notFound(e);
      }

      throw internal(e);
    }
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
    try {
      const { streamsClient } = await getScopedClients({ request });
      return {
        streams: await streamsClient.listStreams(),
      };
    } catch (e) {
      if (e instanceof DefinitionNotFound) {
        throw notFound(e);
      }

      throw internal(e);
    }
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
  handler: async ({ params, request, getScopedClients }) => {
    try {
      const { streamsClient } = await getScopedClients({ request });

      return await streamsClient.upsertStream({
        request: params.body,
        name: params.path.id,
      });
    } catch (e) {
      if (e instanceof IndexTemplateNotFound || e instanceof DefinitionNotFound) {
        throw notFound(e);
      }

      if (
        e instanceof SecurityException ||
        e instanceof ForkConditionMissing ||
        e instanceof MalformedStreamId ||
        e instanceof RootStreamImmutabilityException
      ) {
        throw badRequest(e);
      }

      throw internal(e);
    }
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
    try {
      const { streamsClient } = await getScopedClients({
        request,
      });

      await streamsClient.deleteStream(params.path.id);

      return { acknowledged: true };
    } catch (e) {
      if (e instanceof IndexTemplateNotFound || e instanceof DefinitionNotFound) {
        throw notFound(e);
      }

      if (
        e instanceof SecurityException ||
        e instanceof ForkConditionMissing ||
        e instanceof MalformedStreamId
      ) {
        throw badRequest(e);
      }

      throw internal(e);
    }
  },
});

export const crudRoutes = {
  ...readStreamRoute,
  ...streamDetailRoute,
  ...listStreamsRoute,
  ...editStreamRoute,
  ...deleteStreamRoute,
};
