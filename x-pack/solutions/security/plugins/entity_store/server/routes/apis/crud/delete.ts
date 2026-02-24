/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { EntityNotFoundError } from '../../../domain/errors';

const bodySchema = z.object({
  entityId: z.string(),
});

export function registerCRUDDelete(router: EntityStorePluginRouter) {
  router.versioned
    .delete({
      path: '/internal/security/entity-store/entities/',
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
        const { logger, crudClient } = entityStoreCtx;

        logger.debug('CRUD Delete api called');

        try {
          await crudClient.deleteEntity(req.body.entityId);
        } catch (error) {
          if (error instanceof EntityNotFoundError) {
            return res.customError({
              statusCode: 404,
              body: error,
            });
          }

          logger.error(error);
          throw error;
        }

        return res.ok({ body: { deleted: true } });
      })
    );
}
