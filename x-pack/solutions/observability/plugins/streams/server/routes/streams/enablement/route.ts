/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, internal } from '@hapi/boom';
import { z } from '@kbn/zod';
import { SecurityException } from '../../../lib/streams/errors';
import { createServerRoute } from '../../create_server_route';
import { deleteStream } from '../crud/route';
import { EnableStreamsResponse } from '../../../lib/streams/client';

export const enableStreamsRoute = createServerRoute({
  endpoint: 'POST /api/streams/_enable',
  params: z.object({}),
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
  handler: async ({ request, getScopedClients }): Promise<EnableStreamsResponse> => {
    try {
      const { streamsClient } = await getScopedClients({
        request,
      });

      return await streamsClient.enableStreams();
    } catch (e) {
      if (e instanceof SecurityException) {
        throw badRequest(e);
      }
      throw internal(e);
    }
  },
});

export const disableStreamsRoute = createServerRoute({
  endpoint: 'POST /api/streams/_disable',
  params: z.object({}),
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: ['streams_write'],
    },
  },
  handler: async ({ request, logger, getScopedClients }): Promise<{ acknowledged: true }> => {
    try {
      const { scopedClusterClient, assetClient } = await getScopedClients({ request });

      await deleteStream(scopedClusterClient, assetClient, 'logs', logger);

      return { acknowledged: true };
    } catch (e) {
      if (e instanceof SecurityException) {
        throw badRequest(e);
      }
      throw internal(e);
    }
  },
});

export const enablementRoutes = {
  ...enableStreamsRoute,
  ...disableStreamsRoute,
};
