/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { badRequest, internal, notFound } from '@hapi/boom';
import { conditionSchema, isWiredStream, WiredStreamDefinition } from '@kbn/streams-schema';
import {
  DefinitionNotFound,
  ForkConditionMissing,
  IndexTemplateNotFound,
  SecurityException,
} from '../../../lib/streams/errors';
import { createServerRoute } from '../../create_server_route';
import {
  syncStream,
  readStream,
  listStreams,
  streamsEnabled,
  validateAncestorFields,
} from '../../../lib/streams/stream_crud';
import { MalformedStreamId } from '../../../lib/streams/errors/malformed_stream_id';
import { isChildOf } from '../../../lib/streams/helpers/hierarchy';
import { validateCondition } from '../../../lib/streams/helpers/condition_fields';
import { checkReadAccess } from '../../../lib/streams/stream_crud';
import { conditionToQueryDsl } from '../../../lib/streams/helpers/condition_to_query_dsl';
import { getFields, isComplete } from '../../../lib/streams/helpers/condition_fields';

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
    body: z.object({ stream: z.object({ name: z.string() }), condition: conditionSchema }),
  }),
  handler: async ({
    params,
    logger,
    request,
    getScopedClients,
  }): Promise<{ acknowledged: true }> => {
    try {
      if (!params.body.condition) {
        throw new ForkConditionMissing('You must provide a condition to fork a stream');
      }

      validateCondition(params.body.condition);

      const { scopedClusterClient } = await getScopedClients({ request });

      const rootDefinition = await readStream({
        scopedClusterClient,
        id: params.path.id,
      });

      if (!isWiredStream(rootDefinition)) {
        throw new MalformedStreamId('Cannot fork a stream that is not managed');
      }

      const childDefinition: WiredStreamDefinition = {
        ...params.body.stream,
        stream: { ingest: { processing: [], routing: [], wired: { fields: {} } } },
      };

      // check whether root stream has a child of the given name already
      if (
        rootDefinition.stream.ingest.routing.some((child) => child.name === childDefinition.name)
      ) {
        throw new MalformedStreamId(
          `The stream with ID (${params.body.stream.name}) already exists as a child of the parent stream`
        );
      }

      if (!isChildOf(rootDefinition, childDefinition)) {
        throw new MalformedStreamId(
          `The ID (${params.body.stream.name}) from the new stream must start with the parent's id (${rootDefinition.name}), followed by a dot and a name`
        );
      }

      await validateAncestorFields(
        scopedClusterClient,
        childDefinition.name,
        childDefinition.stream.ingest.wired.fields
      );

      // need to create the child first, otherwise we risk streaming data even though the child data stream is not ready
      await syncStream({
        scopedClusterClient,
        definition: childDefinition,
        rootDefinition,
        logger,
      });

      rootDefinition.stream.ingest.routing.push({
        name: params.body.stream.name,
        condition: params.body.condition,
      });

      await syncStream({
        scopedClusterClient,
        definition: rootDefinition,
        rootDefinition,
        logger,
      });

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
  handler: async ({ logger, request, getScopedClients }): Promise<{ acknowledged: true }> => {
    const { scopedClusterClient } = await getScopedClients({ request });

    const { streams } = await listStreams({ scopedClusterClient });

    for (const stream of streams) {
      const definition = await readStream({
        scopedClusterClient,
        id: stream.name,
      });

      await syncStream({
        scopedClusterClient,
        definition,
        logger,
      });
    }

    return { acknowledged: true };
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
    const { scopedClusterClient } = await getScopedClients({ request });

    return {
      enabled: await streamsEnabled({ scopedClusterClient }),
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
      condition: z.optional(conditionSchema),
      start: z.optional(z.number()),
      end: z.optional(z.number()),
      number: z.optional(z.number()),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<{ documents: unknown[] }> => {
    try {
      const { scopedClusterClient } = await getScopedClients({ request });

      const hasAccess = await checkReadAccess({ id: params.path.id, scopedClusterClient });
      if (!hasAccess) {
        throw new DefinitionNotFound(`Stream definition for ${params.path.id} not found.`);
      }
      const searchBody = {
        query: {
          bool: {
            must: [
              isComplete(params.body.condition)
                ? conditionToQueryDsl(params.body.condition)
                : { match_all: {} },
              {
                range: {
                  '@timestamp': {
                    gte: params.body.start,
                    lte: params.body.end,
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
        runtime_mappings: Object.fromEntries(
          getFields(params.body.condition).map((field) => [
            field.name,
            { type: field.type === 'string' ? 'keyword' : 'double' },
          ])
        ),
        sort: [
          {
            '@timestamp': {
              order: 'desc',
            },
          },
        ],
        size: params.body.number,
      };
      const results = await scopedClusterClient.asCurrentUser.search({
        index: params.path.id,
        ...searchBody,
      });

      return { documents: results.hits.hits.map((hit) => hit._source) };
    } catch (e) {
      if (e instanceof DefinitionNotFound) {
        throw notFound(e);
      }

      throw internal(e);
    }
  },
});

export const managementRoutes = {
  ...forkStreamsRoute,
  ...resyncStreamsRoute,
  ...getStreamsStatusRoute,
  ...sampleStreamRoute,
};
