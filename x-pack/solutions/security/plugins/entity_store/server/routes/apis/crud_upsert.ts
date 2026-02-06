/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import { EntityStoreNotInstalledError } from '../../domain/errors';
import { Entity } from '../../domain/schemas/entity.gen';

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
        version: API_VERSIONS.public.v1, // TODO: KUBA: SHould it be public? Really?
        validate: {
          request: {
            body: buildRouteValidationWithZod(Entity),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const { logger, assetManager, entityManager } = entityStoreCtx;

        logger.debug('CRUD Upsert api called');
        if (!(await assetManager.isInstalled())) {
          return res.customError({ statusCode: 503, body: new EntityStoreNotInstalledError() });
        }
        // TODO: Check if skipping ?force flag does anything
        // TODO: use req.body as entity to create
        // TODO: ask guys do we REALLY need generated schemas
        try {
          await entityManager.upsertEntity(req.body);
        } catch (error) {
          logger.error(error);
          throw error;
        }

        return res.ok({
          body: {
            ok: true,
          },
        });
      })
    );
}
