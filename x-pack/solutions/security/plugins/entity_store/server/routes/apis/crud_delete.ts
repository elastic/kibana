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
import { EntityNotFoundError, EntityStoreNotInstalledError } from '../../domain/errors';

const paramsSchema = z.object({
  id: z.string(),
});

export function registerCRUDDelete(router: EntityStorePluginRouter) {
  router.versioned
    .delete({
      path: '/api/entity-store/entities/{id}',
      access: 'public',
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
            params: buildRouteValidationWithZod(paramsSchema),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const { logger, assetManager, crudClient } = entityStoreCtx;

        logger.debug('CRUD Delete api called');
        if (!(await assetManager.isInstalled())) {
          return res.customError({ statusCode: 503, body: new EntityStoreNotInstalledError() });
        }

        try {
          await crudClient.deleteEntity(req.params.id);
        } catch (error) {
          if (error instanceof EntityNotFoundError) {
            return res.customError({
              statusCode: 404,
              body: error as EntityNotFoundError,
            });
          }
          logger.error(error);
          throw error;
        }

        return res.ok({ body: { deleted: true } });
      })
    );
}
