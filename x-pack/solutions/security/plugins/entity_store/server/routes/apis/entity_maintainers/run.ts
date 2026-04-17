/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { maintainerIdParamsSchema, runMaintainerQuerySchema } from './utils/validator';

const RUN_MAINTAINER_SYNC_SOCKET_TIMEOUT_MS = 10 * 60 * 1000;

export function registerRunMaintainer(router: EntityStorePluginRouter) {
  router.versioned
    .post({
      path: ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_RUN,
      access: 'internal',
      security: {
        authz: DEFAULT_ENTITY_STORE_PERMISSIONS,
      },
      options: {
        timeout: {
          idleSocket: RUN_MAINTAINER_SYNC_SOCKET_TIMEOUT_MS,
        },
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v2,
        validate: {
          request: {
            params: buildRouteValidationWithZod(maintainerIdParamsSchema),
            query: buildRouteValidationWithZod(runMaintainerQuerySchema),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const { logger, entityMaintainersClient } = entityStoreCtx;
        const { id } = req.params;
        const { sync } = req.query;

        logger.debug(`Run maintainer API invoked for id: ${id}`);

        if (sync) {
          await entityMaintainersClient.runSync(id, req);
        } else {
          await entityMaintainersClient.runNow(id);
        }

        return res.ok({ body: { ok: true } });
      })
    );
}
