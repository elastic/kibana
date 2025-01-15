/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internal, notFound } from '@hapi/boom';
import {
  FieldDefinitionConfig,
  ReadStreamDefinition,
  WiredReadStreamDefinition,
  isWiredStream,
} from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { isResponseError } from '@kbn/es-errors';
import { DefinitionNotFound } from '../../lib/streams/errors';
import { createServerRoute } from '../create_server_route';
import { getDataStreamLifecycle } from '../../lib/streams/stream_crud';

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
