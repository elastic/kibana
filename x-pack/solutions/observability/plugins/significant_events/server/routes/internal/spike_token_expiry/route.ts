/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// SPIKE: throwaway route to reproduce a service account token expiring while a handler runs.
// Never commit.

import { setTimeout as sleep } from 'timers/promises';
import { badGateway } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { createServerRoute } from '../../create_server_route';

const NO_AUTHZ = { authz: { enabled: false as const, reason: 'Spike' } };

const MAX_SECONDS = 1200;

// Awaited, so keep `seconds` under the HTTP socket timeout (120s), which closes the self-call.
const holdRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/spike/_hold',
  options: { access: 'internal' },
  security: NO_AUTHZ,
  params: z.object({
    body: z.object({
      seconds: z.number().int().min(1).max(MAX_SECONDS),
      stepSeconds: z.number().int().min(1).max(MAX_SECONDS).default(15),
    }),
  }),
  handler: async ({ params, request, getScopedClients, logger }) => {
    const { scopedClusterClient } = await getScopedClients({ request });
    const { seconds, stepSeconds } = params.body;
    const startedAt = Date.now();
    logger.info(
      `[DEBUG-sa-token] hold start seconds=${seconds} step=${stepSeconds} isFakeRequest=${request.isFakeRequest}`
    );
    while (Date.now() - startedAt < seconds * 1000) {
      await sleep(stepSeconds * 1000);
      const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
      try {
        await scopedClusterClient.asCurrentUser.search({
          index: 'logs*',
          size: 0,
          allow_no_indices: true,
        });
        logger.info(`[DEBUG-sa-token] ES call ok at ${elapsedSeconds}s`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.info(`[DEBUG-sa-token] ES call FAILED at ${elapsedSeconds}s: ${message}`);
        // Surfaces the failure in the workflow run instead of only in the Kibana log.
        throw badGateway(
          `Elasticsearch call failed ${elapsedSeconds}s into the handler: ${message}`
        );
      }
    }
    logger.info(`[DEBUG-sa-token] hold end after ${seconds}s`);
    return { ok: true, seconds };
  },
});

export const internalSpikeTokenExpiryRoutes = { ...holdRoute };
