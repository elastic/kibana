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
import { ALL_ENTITY_TYPES, EntityType } from '../../domain/definitions/entity_type';
import { stopExtractEntityTasks } from '../../tasks/extract_entity_task';

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
      async (ctx, req, res) => {
        const entityStoreCtx = await ctx.entityStore;
        const { taskManagerStart, logger } = entityStoreCtx;
        const { entityTypes } = req.body;

        logger.info('Stop API invoked');

        const stoppedTasks = await stopExtractEntityTasks({
          taskManager: taskManagerStart,
          logger,
          entityTypes,
        });

        return res.ok({
          body: {
            ok: true,
            stoppedTasks,
          },
        });
      }
    );
}
