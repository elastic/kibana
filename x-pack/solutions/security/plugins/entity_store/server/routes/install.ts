/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from './constants';
import { EntityType } from '../domain/definitions/entity_type';
import type { EntityStorePluginRouter } from '../types';

const bodySchema = z.object({
  entityType: z.array(EntityType).optional(),
});

export function registerInstall(router: EntityStorePluginRouter) {
  router.versioned
    .post({
      path: '/internal/security/entity-store/install',
      access: 'internal',
      security: {
        authz: DEFAULT_ENTITY_STORE_PERMISSIONS,
      },
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
      async (ctx, req, res) => {
        const entityStoreCtx = await ctx.entityStore;
        const logger = entityStoreCtx.getLogger();
        const resourcesService = entityStoreCtx.getResourcesService();

        logger.debug('Install api called');
        resourcesService.install(req.body.entityType);

        return res.ok({
          body: {
            ok: true,
          },
        });
      }
    );
}
