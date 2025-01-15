/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { internal, notFound } from '@hapi/boom';
import { getFlattenedObject } from '@kbn/std';
import { isWiredStream } from '@kbn/streams-schema';
import { DefinitionNotFound } from '../../../lib/streams/errors';
import { createServerRoute } from '../../create_server_route';

const SAMPLE_SIZE = 500;

export const unmappedFieldsRoute = createServerRoute({
  endpoint: 'GET /api/streams/{id}/schema/unmapped_fields',
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
  handler: async ({ params, request, getScopedClients }): Promise<{ unmappedFields: string[] }> => {
    try {
      const { scopedClusterClient, streamsClient } = await getScopedClients({ request });

      const searchBody = {
        sort: [
          {
            '@timestamp': {
              order: 'desc',
            },
          },
        ],
        size: SAMPLE_SIZE,
      };

      const [streamDefinition, ancestors, results] = await Promise.all([
        streamsClient.getStream(params.path.id),
        streamsClient.getAncestors(params.path.id),
        scopedClusterClient.asCurrentUser.search({
          index: params.path.id,
          ...searchBody,
        }),
      ]);

      const sourceFields = new Set<string>();

      results.hits.hits.forEach((hit) => {
        Object.keys(getFlattenedObject(hit._source as Record<string, unknown>)).forEach((field) => {
          sourceFields.add(field);
        });
      });

      // Mapped fields from the stream's definition and inherited from ancestors
      const mappedFields = new Set<string>();

      if (isWiredStream(streamDefinition)) {
        Object.keys(streamDefinition.stream.ingest.wired.fields).forEach((name) =>
          mappedFields.add(name)
        );
      }

      for (const ancestor of ancestors) {
        Object.keys(ancestor.stream.ingest.wired.fields).forEach((name) => mappedFields.add(name));
      }

      const unmappedFields = Array.from(sourceFields)
        .filter((field) => !mappedFields.has(field))
        .sort();

      return { unmappedFields };
    } catch (e) {
      if (e instanceof DefinitionNotFound) {
        throw notFound(e);
      }

      throw internal(e);
    }
  },
});
