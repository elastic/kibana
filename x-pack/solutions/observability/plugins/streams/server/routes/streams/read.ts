/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { notFound, internal } from '@hapi/boom';
import {
  FieldDefinitionConfig,
  isWiredReadStream,
  ReadStreamDefinition,
  WiredReadStreamDefinition,
} from '@kbn/streams-schema';
import { createServerRoute } from '../create_server_route';
import { DefinitionNotFound } from '../../lib/streams/errors';
import { readAncestors, readStream } from '../../lib/streams/stream_crud';

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
      const { scopedClusterClient, assetClient } = await getScopedClients({ request });
      const streamEntity = await readStream({
        scopedClusterClient,
        id: params.path.id,
      });
      const dashboards = await assetClient.getAssetIds({
        entityId: streamEntity.name,
        entityType: 'stream',
        assetType: 'dashboard',
      });

      if (!isWiredReadStream(streamEntity)) {
        return {
          ...streamEntity,
          dashboards,
          inherited_fields: {},
        };
      }

      const { ancestors } = await readAncestors({
        name: streamEntity.name,
        scopedClusterClient,
      });

      const body: WiredReadStreamDefinition = {
        ...streamEntity,
        dashboards,
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
      if (e instanceof DefinitionNotFound) {
        throw notFound(e);
      }

      throw internal(e);
    }
  },
});
