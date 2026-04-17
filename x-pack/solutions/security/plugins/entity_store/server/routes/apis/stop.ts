/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import { ALL_ENTITY_TYPES, EntityType } from '../../../common/domain/definitions/entity_schema';
import { ENGINE_STATUS } from '../../domain/constants';

const bodySchema = z.object({
  entityTypes: z
    .array(EntityType)
    .optional()
    .default(ALL_ENTITY_TYPES)
    .describe('Entity types to stop. Defaults to all running types.'),
});

export function registerStop(router: EntityStorePluginRouter) {
  router.versioned
    .put({
      path: ENTITY_STORE_ROUTES.public.STOP,
      access: 'public',
      summary: 'Stop Entity Store engines',
      description:
        'Stop running entity engines, pausing data processing for the specified entity types.',
      options: {
        tags: ['oas-tag:Security entity store'],
      },
      security: {
        authz: DEFAULT_ENTITY_STORE_PERMISSIONS,
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(bodySchema),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/entity_store_stop.yaml'),
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const { logger, assetManagerClient: assetManager } = entityStoreCtx;
        const { entityTypes } = req.body;

        logger.debug('Stop API invoked');

        const { engines } = await assetManager.getStatus();
        const startedTypes = new Set(
          engines.filter((e) => e.status === ENGINE_STATUS.STARTED).map((e) => e.type)
        );
        const toStop = entityTypes.filter((type) => startedTypes.has(type));

        await Promise.all(toStop.map((type) => assetManager.stop(type)));

        return res.ok({
          body: {
            ok: true,
          },
        });
      })
    );
}
