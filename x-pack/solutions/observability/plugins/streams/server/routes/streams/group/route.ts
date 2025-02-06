/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { badRequest } from '@hapi/boom';
import {
  GroupObjectGetResponse,
  groupObjectUpsertRequestSchema,
  GroupStreamUpsertRequest,
  isGroupStreamDefinition,
} from '@kbn/streams-schema';
import { createServerRoute } from '../../create_server_route';

const readGroupRoute = createServerRoute({
  endpoint: 'GET /api/streams/{id}/_group',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions',
    },
  },
  params: z.object({
    path: z.object({ id: z.string() }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<GroupObjectGetResponse> => {
    const { streamsClient } = await getScopedClients({
      request,
    });

    const name = params.path.id;

    const definition = await streamsClient.getStream(name);

    if (isGroupStreamDefinition(definition)) {
      return { group: definition.group };
    }

    throw badRequest(`Stream is not an ingest stream`);
  },
});

const upsertGroupRoute = createServerRoute({
  endpoint: 'PUT /api/streams/{id}/_group',
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
    body: groupObjectUpsertRequestSchema,
  }),
  handler: async ({ params, request, getScopedClients }) => {
    const { streamsClient, assetClient } = await getScopedClients({
      request,
    });

    const name = params.path.id;

    const assets = await assetClient.getAssets({
      entityId: name,
      entityType: 'stream',
    });

    const groupUpsertRequest = params.body;

    const dashboards = assets
      .filter((asset) => asset.assetType === 'dashboard')
      .map((asset) => asset.assetId);

    const upsertRequest = {
      dashboards,
      stream: groupUpsertRequest,
    } as GroupStreamUpsertRequest;

    return await streamsClient.upsertStream({
      request: upsertRequest,
      name: params.path.id,
    });
  },
});

export const groupRoutes = {
  ...readGroupRoute,
  ...upsertGroupRoute,
};
