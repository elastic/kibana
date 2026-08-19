/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  PND_WORKER_URL_TEMPLATE,
  type WatchWorker,
} from '@kbn/pnd-common';
import { PND_API_PRIVILEGE_WRITE } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';
import { storeUnavailableResponse } from '../store_route_guard';

const UpdateWorkerRequestParams = z.object({
  workerId: z.string().min(1).max(128),
});

/** Toggles the worker's global flag. Per-watch attachments are patched via PATCH /watches/{id}. */
const UpdateWorkerRequestBody = z.object({
  enabled: z.boolean(),
});

export const registerUpdateWorkerRoute = ({
  router,
  logger,
  config,
  getWatchesService,
}: RouteDependencies) => {
  router.versioned
    .patch({
      path: PND_WORKER_URL_TEMPLATE,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [PND_API_PRIVILEGE_WRITE],
        },
      },
      summary: 'Update a PND worker',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(UpdateWorkerRequestParams),
            body: buildRouteValidationWithZod(UpdateWorkerRequestBody),
          },
        },
      },
      async (_context, request, response) => {
        try {
          if (!config.ui.useMockData) {
            return storeUnavailableResponse(response);
          }

          const { workerId } = request.params;
          const worker = getWatchesService().setWorkerEnabled(workerId, request.body.enabled);
          if (!worker) {
            return response.notFound({
              body: { message: `Worker "${workerId}" not found` },
            });
          }

          const body: { worker: WatchWorker } = { worker };
          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to update worker: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to update worker' },
          });
        }
      }
    );
};
