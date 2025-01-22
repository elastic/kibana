/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { badRequest, internal, notFound } from '@hapi/boom';
import type { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import type {
  ListStreamsResponse,
  FieldDefinitionConfig,
  ReadStreamDefinition,
  WiredReadStreamDefinition} from '@kbn/streams-schema';
import {
  streamConfigDefinitionSchema,
  isWiredStream,
} from '@kbn/streams-schema';
import { isResponseError } from '@kbn/es-errors';
import { MalformedStreamId } from '../../../lib/streams/errors/malformed_stream_id';
import {
  DefinitionNotFound,
  ForkConditionMissing,
  IndexTemplateNotFound,
  RootStreamImmutabilityException,
  SecurityException,
} from '../../../lib/streams/errors';
import { createServerRoute } from '../../create_server_route';
import { getDataStreamLifecycle } from '../../../lib/streams/stream_crud';

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
  handler: async ({ params, request, getScopedClients }): Promise<ReadStreamDefinition> => {
    try {
      const { assetClient, streamsClient } = await getScopedClients({
        request,
      });

      const name = params.path.id;

      const [streamDefinition, dashboards, ancestors, dataStream] = await Promise.all([
        streamsClient.getStream(name),
        assetClient.getAssetIds({
          entityId: name,
          entityType: 'stream',
          assetType: 'dashboard',
        }),
        streamsClient.getAncestors(name),
        streamsClient.getDataStream(name),
      ]);

      const lifecycle = getDataStreamLifecycle(dataStream);

      if (!isWiredStream(streamDefinition)) {
        return {
          ...streamDefinition,
          lifecycle,
          dashboards,
          inherited_fields: {},
        };
      }

      const body: WiredReadStreamDefinition = {
        ...streamDefinition,
        dashboards,
        lifecycle,
        inherited_fields: ancestors.reduce((acc, def) => {
          Object.entries(def.stream.ingest.wired.fields).forEach(([key, fieldDef]) => {
            acc[key] = { ...fieldDef, from: def.name };
          });
          return acc;
          // TODO: replace this with a proper type
        }, {} as Record<string, FieldDefinitionConfig & { from: string }>),
      };

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
  handler: async ({ request, getScopedClients }): Promise<ListStreamsResponse> => {
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
    body: streamConfigDefinitionSchema,
  }),
  handler: async ({ params, request, getScopedClients }) => {
    try {
      const { streamsClient } = await getScopedClients({ request });
      const streamDefinition = { stream: params.body, name: params.path.id };

      return await streamsClient.upsertStream({ definition: streamDefinition });
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
