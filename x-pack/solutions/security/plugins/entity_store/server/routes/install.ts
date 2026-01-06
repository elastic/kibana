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
      async (ctx, req, res) => {
        const entityStoreCtx = await ctx.entityStore;
        const logger = entityStoreCtx.logger;
        const resourcesService = entityStoreCtx.getResourcesService();
        const isEntityStoreV2Enabled = await entityStoreCtx
          .getFeatureFlags()
          .isEntityStoreV2Enabled();

        logger.debug('Install api called');

        if (!isEntityStoreV2Enabled) {
          logger.warn('Entity store v2 cannot be installed (feature flag not enabled)');
          return res.customError({
            statusCode: 501,
            body: {
              message: 'Entity store v2 cannot be installed (feature flag not enabled)',
            },
          });
        }

        resourcesService.install(req.body.entityType);
        return res.ok({
          body: {
            ok: true,
          },
        });
      }
    );
}
