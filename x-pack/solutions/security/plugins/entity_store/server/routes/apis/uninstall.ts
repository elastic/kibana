/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { ALL_ENTITY_TYPES, EntityType } from '../../domain/definitions/entity_schema';
import { wrapMiddlewares } from '../middleware';

const bodySchema = z.object({
  entityType: z.array(EntityType).optional().default(ALL_ENTITY_TYPES),
});

export function registerUninstall(router: EntityStorePluginRouter) {
  router.versioned
    .post({
      path: '/internal/security/entity-store/uninstall',
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
      wrapMiddlewares(async (ctx, req, res) => {
        const { logger, assetManager } = await ctx.entityStore;
        logger.debug(`uninstalling entities: [${req.body.entityType.join(', ')}]`);

        await Promise.all(req.body.entityType.map((type) => assetManager.uninstall(type)));

        return res.ok({
          body: {
            ok: true,
          },
        });
      })
    );
}
