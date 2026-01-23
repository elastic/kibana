/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import { ALL_ENTITY_TYPES, EntityType } from '../../domain/definitions/entity_schema';

const bodySchema = z.object({
  entityTypes: z.array(EntityType).optional().default(ALL_ENTITY_TYPES),
});

export function registerStop(router: EntityStorePluginRouter) {
  router.versioned
    .put({
      path: '/internal/security/entity-store/stop',
      access: 'internal',
      security: {
        authz: DEFAULT_ENTITY_STORE_PERMISSIONS,
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v2,
        validate: {
          request: {
            body: buildRouteValidationWithZod(bodySchema),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const { logger, assetManager } = entityStoreCtx;
        const { entityTypes } = req.body;

        logger.debug('Stop API invoked');

        const stoppedTasks = await Promise.all(entityTypes.map((type) => assetManager.stop(type)));

        return res.ok({
          body: {
            stoppedTasks,
          },
        });
      })
    );
}
