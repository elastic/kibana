/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { badRequest, internal, notFound } from '@hapi/boom';
import { conditionSchema } from '@kbn/streams-schema';
import { errors } from '@elastic/elasticsearch';
import {
  DefinitionNotFound,
  ForkConditionMissing,
  IndexTemplateNotFound,
  RootStreamImmutabilityException,
  SecurityException,
} from '../../../lib/streams/errors';
import { createServerRoute } from '../../create_server_route';
import { checkAccess } from '../../../lib/streams/stream_crud';
import { MalformedStreamId } from '../../../lib/streams/errors/malformed_stream_id';
import { conditionToQueryDsl } from '../../../lib/streams/helpers/condition_to_query_dsl';
import { getFields } from '../../../lib/streams/helpers/condition_fields';
import { ResyncStreamsResponse } from '../../../lib/streams/client';

export const forkStreamsRoute = createServerRoute({
  endpoint: 'POST /api/streams/{id}/_fork',
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
    body: z.object({ stream: z.object({ name: z.string() }), if: conditionSchema }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<{ acknowledged: true }> => {
    try {
      if (!params.body.if) {
        throw new ForkConditionMissing('You must provide a condition to fork a stream');
      }

      const { streamsClient } = await getScopedClients({
        request,
      });

      return await streamsClient.forkStream({
        parent: params.path.id,
        if: params.body.if,
        name: params.body.stream.name,
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

export const resyncStreamsRoute = createServerRoute({
  endpoint: 'POST /api/streams/_resync',
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
  handler: async ({ request, getScopedClients }): Promise<ResyncStreamsResponse> => {
    const { streamsClient } = await getScopedClients({ request });

    return await streamsClient.resyncStreams();
  },
});

export const getStreamsStatusRoute = createServerRoute({
  endpoint: 'GET /api/streams/_status',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: ['streams_read'],
    },
  },
  handler: async ({ request, getScopedClients }): Promise<{ enabled: boolean }> => {
    const { streamsClient } = await getScopedClients({ request });

    return {
      enabled: await streamsClient.isStreamsEnabled(),
    };
  },
});

export const sampleStreamRoute = createServerRoute({
  endpoint: 'POST /api/streams/{id}/_sample',
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
    body: z.object({
      if: z.optional(conditionSchema),
      start: z.optional(z.number()),
      end: z.optional(z.number()),
      size: z.optional(z.number()),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<{ documents: unknown[] }> => {
    try {
      const { scopedClusterClient } = await getScopedClients({ request });

      const { read } = await checkAccess({ id: params.path.id, scopedClusterClient });
      if (!read) {
        throw new DefinitionNotFound(`Stream definition for ${params.path.id} not found.`);
      }

      const { if: condition, start, end, size } = params.body;
      const searchBody = {
        query: {
          bool: {
            must: [
              condition ? conditionToQueryDsl(condition) : { match_all: {} },
              {
                range: {
                  '@timestamp': {
                    gte: start,
                    lte: end,
                    format: 'epoch_millis',
                  },
                },
              },
            ],
          },
        },
        // Conditions could be using fields which are not indexed or they could use it with other types than they are eventually mapped as.
        // Because of this we can't rely on mapped fields to draw a sample, instead we need to use runtime fields to simulate what happens during
        // ingest in the painless condition checks.
        // This is less efficient than it could be - in some cases, these fields _are_ indexed with the right type and we could use them directly.
        // This can be optimized in the future.
        runtime_mappings: condition
          ? Object.fromEntries(
              getFields(condition).map((field) => [
                field.name,
                { type: field.type === 'string' ? 'keyword' : 'double' },
              ])
            )
          : undefined,
        sort: [
          {
            '@timestamp': {
              order: 'desc',
            },
          },
        ],
        terminate_after: size,
        track_total_hits: false,
        size,
      };
      const results = await scopedClusterClient.asCurrentUser.search({
        index: params.path.id,
        allow_no_indices: true,
        ...searchBody,
      });

      return { documents: results.hits.hits.map((hit) => hit._source) };
    } catch (error) {
      if (error instanceof errors.ResponseError && error.meta.statusCode === 404) {
        throw notFound(error);
      }
      if (error instanceof DefinitionNotFound) {
        throw notFound(error);
      }

      throw internal(error);
    }
  },
});

export const managementRoutes = {
  ...forkStreamsRoute,
  ...resyncStreamsRoute,
  ...getStreamsStatusRoute,
  ...sampleStreamRoute,
};
