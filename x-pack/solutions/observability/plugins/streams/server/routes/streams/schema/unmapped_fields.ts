/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { internal, notFound } from '@hapi/boom';
import { getFlattenedObject } from '@kbn/std';
import { isWiredReadStream } from '@kbn/streams-schema';
import { DefinitionNotFound } from '../../../lib/streams/errors';
import { checkAccess, readAncestors, readStream } from '../../../lib/streams/stream_crud';
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
      const { scopedClusterClient } = await getScopedClients({ request });

      const { read } = await checkAccess({ id: params.path.id, scopedClusterClient });
      if (!read) {
        throw new DefinitionNotFound(`Stream definition for ${params.path.id} not found.`);
      }

      const streamEntity = await readStream({
        scopedClusterClient,
        id: params.path.id,
      });

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

      const results = await scopedClusterClient.asCurrentUser.search({
        index: params.path.id,
        ...searchBody,
      });

      const sourceFields = new Set<string>();

      results.hits.hits.forEach((hit) => {
        Object.keys(getFlattenedObject(hit._source as Record<string, unknown>)).forEach((field) => {
          sourceFields.add(field);
        });
      });

      // Mapped fields from the stream's definition and inherited from ancestors
      const mappedFields = new Set<string>();

      if (isWiredReadStream(streamEntity)) {
        Object.keys(streamEntity.stream.ingest.wired.fields).forEach((name) =>
          mappedFields.add(name)
        );
      }

      const { ancestors } = await readAncestors({
        name: params.path.id,
        scopedClusterClient,
      });

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
