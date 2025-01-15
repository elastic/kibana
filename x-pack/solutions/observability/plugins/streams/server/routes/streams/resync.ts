/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ResyncStreamsResponse } from '../../lib/streams/client';
import { createServerRoute } from '../create_server_route';

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
