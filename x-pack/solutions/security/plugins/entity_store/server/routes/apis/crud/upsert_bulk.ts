/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BooleanFromString, buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { ENTITY_STORE_ROUTES } from '../../../../common';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { ENGINE_STATUS } from '../../../domain/constants';
import { BadCRUDRequestError, EntityStoreNotRunningError } from '../../../domain/errors';
import { Entity } from '../../../../common/domain/definitions/entity.gen';

const ENTITY_TYPES = ['user', 'host', 'service', 'generic'] as const;

const bodySchema = z.object({
  entities: z.array(
    z.object({
      type: z.enum(ENTITY_TYPES),
      doc: Entity,
    })
  ),
});

const querySchema = z.object({
  force: BooleanFromString.optional().default(false),
});

export function registerCRUDUpsertBulk(router: EntityStorePluginRouter) {
  router.versioned
    .put({
      path: ENTITY_STORE_ROUTES.CRUD_UPSERT_BULK,
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
            query: buildRouteValidationWithZod(querySchema),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const { logger, assetManagerClient: assetManager, crudClient } = entityStoreCtx;

        logger.debug('CRUD Upsert Bulk api called');
        const { engines } = await assetManager.getStatus();
        if (engines.some((engine) => engine.status !== ENGINE_STATUS.STARTED)) {
          return res.customError({ statusCode: 503, body: new EntityStoreNotRunningError() });
        }

        try {
          const errors = await crudClient.upsertEntitiesBulk({
            objects: req.body.entities,
            force: req.query.force,
          });
          return res.ok({
            body: {
              ok: true,
              errors,
            },
          });
        } catch (error) {
          if (error instanceof BadCRUDRequestError) {
            return res.badRequest({ body: error });
          }

          logger.error(error);
          throw error;
        }
      })
    );
}
