/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BooleanFromString, buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import { EntityStoreNotInstalledError } from '../../domain/errors';
import { Entity } from '../../../common/domain/definitions/entity.gen';
import { EntityType } from '@kbn/entity-store/common/domain/definitions/entity_schema';

const bodySchema = z.array(z.object({
  type: EntityType,
  document: Entity
}));

const querySchema = z.object({
  force: BooleanFromString.optional().default(false),
});

export function registerCRUDUpsertBulk(router: EntityStorePluginRouter) {
  router.versioned
    .put({
      path: '/api/entity-store/entities/bulk',
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
            body: buildRouteValidationWithZod(bodySchema),
            query: buildRouteValidationWithZod(querySchema),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const { logger, assetManager, entityManager } = entityStoreCtx;

        logger.debug('CRUD Upsert Bulk api called');
        if (!(await assetManager.isInstalled())) {
          return res.customError({ statusCode: 503, body: new EntityStoreNotInstalledError() });
        }

        try {
          await entityManager.upsertEntitiesBulk(req.body, req.query.force);
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
