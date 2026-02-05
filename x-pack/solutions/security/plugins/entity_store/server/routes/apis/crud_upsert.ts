/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';
import type { IKibanaResponse } from '@kbn/core-http-server';
import {
  API_VERSIONS,
  DEFAULT_ENTITY_STORE_PERMISSIONS,
  EngineNotRunningError,
} from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import { EntityType } from '../../domain/definitions/entity_schema';

// TODO: openapi schema for body
const bodySchema = z.object({});

export function registerCRUDUpsert(router: EntityStorePluginRouter) {
  router.versioned
    .put({
      path: '/api/entity-store/entities',
      access: 'public',
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

        logger.debug('CRUD Upsert api called');
        const entityType = req.body.entity.type;
        if (!(await assetManager.isInstalled(entityType))) {
          return res.customError({ statusCode: 503, body: new EngineNotRunningError(entityType) });
        }
        // TODO: Check if skipping ?force flag does anything
        // TODO: use req.body as entity to create
        // TODO: ask guys do we REALLY need generated schemas

        return res.ok({
          body: {
            ok: true,
          },
        });
      })
    );
}
