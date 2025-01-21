/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, internal, notFound } from '@hapi/boom';
import { isResponseError } from '@kbn/es-errors';
import {
  IngestGetResponse,
  StreamUpsertRequest,
  ingestUpsertRequestSchema,
  isUnwiredStreamDefinition,
  isWiredStreamDefinition,
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

const readIngestRoute = createServerRoute({
  endpoint: 'GET /api/streams/{id}/_ingest',
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
  handler: async ({ params, request, getScopedClients }): Promise<IngestGetResponse> => {
    try {
      const { streamsClient } = await getScopedClients({
        request,
      });

      const name = params.path.id;

      const definition = await streamsClient.getStream(name);

      if (isWiredStreamDefinition(definition)) {
        return { ingest: definition.ingest };
      }

      if (isUnwiredStreamDefinition(definition)) {
        return { ingest: definition.ingest };
      }

      throw badRequest(`Stream is not an ingest stream`);
    } catch (e) {
      if (e instanceof DefinitionNotFound || (isResponseError(e) && e.statusCode === 404)) {
        throw notFound(e);
      }

      throw internal(e);
    }
  },
});

const upsertIngestRoute = createServerRoute({
  endpoint: 'PUT /api/streams/{id}/_ingest',
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
    body: ingestUpsertRequestSchema,
  }),
  handler: async ({ params, request, getScopedClients }) => {
    try {
      const { streamsClient, assetClient } = await getScopedClients({
        request,
      });

      const name = params.path.id;

      const assets = await assetClient.getAssets({
        entityId: name,
        entityType: 'stream',
      });

      const ingestUpsertRequest = params.body;

      const dashboards = assets
        .filter((asset) => asset.assetType === 'dashboard')
        .map((asset) => asset.assetId);

      const upsertRequest = {
        dashboards,
        stream: ingestUpsertRequest,
      } as StreamUpsertRequest;

      return await streamsClient.upsertStream({
        request: upsertRequest,
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

export const ingestRoutes = {
  ...readIngestRoute,
  ...upsertIngestRoute,
};
