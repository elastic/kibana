/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BooleanFromString, buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { z } from '@kbn/zod';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import { BadCRUDRequestError, EntityStoreNotInstalledError } from '../../domain/errors';
import { Entity } from '../../../common/domain/definitions/entity.gen';
import { EntityType } from '../../../common/domain/definitions/entity_schema';

const paramsSchema = z
  .object({
    entityType: EntityType,
  })
  .required();

const querySchema = z.object({
  force: BooleanFromString.optional().default(false),
});

export function registerCRUDUpsert(router: EntityStorePluginRouter) {
  router.versioned
    .put({
      path: '/api/entity-store/entities/{entityType}',
      access: 'public',
      security: {
        authz: DEFAULT_ENTITY_STORE_PERMISSIONS,
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1, // TODO(kuba): public or internal?
        validate: {
          request: {
            body: buildRouteValidationWithZod(Entity),
            params: buildRouteValidationWithZod(paramsSchema),
            query: buildRouteValidationWithZod(querySchema),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const { logger, assetManager, crudClient } = entityStoreCtx;

        logger.debug('CRUD Upsert api called');
        if (!(await assetManager.isInstalled())) {
          return res.customError({ statusCode: 503, body: new EntityStoreNotInstalledError() });
        }

        try {
          await crudClient.upsertEntity(req.params.entityType, req.body, req.query.force);
        } catch (error) {
          if (error instanceof BadCRUDRequestError) {
            return res.badRequest({ body: error as BadCRUDRequestError });
          }

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
