/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BooleanFromString, buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { z } from '@kbn/zod/v4';
import { ALL_ENTITY_TYPES, ENTITY_STORE_ROUTES } from '../../../../common';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { BadCRUDRequestError, EntityNotFoundError } from '../../../domain/errors';
import { Entity } from '../../../../common/domain/definitions/entity.gen';

const paramsSchema = z
  .object({
    entityType: z.enum(ALL_ENTITY_TYPES),
  })
  .required();

const querySchema = z.object({
  force: BooleanFromString.optional().default(false),
});

export function registerCRUDUpdate(router: EntityStorePluginRouter) {
  router.versioned
    .put({
      path: ENTITY_STORE_ROUTES.CRUD_UPDATE,
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
            body: buildRouteValidationWithZod(Entity),
            params: buildRouteValidationWithZod(paramsSchema),
            query: buildRouteValidationWithZod(querySchema),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const { logger, crudClient } = entityStoreCtx;

        logger.debug('CRUD Update api called');

        try {
          await crudClient.updateEntity(req.params.entityType, req.body, req.query.force);
        } catch (error) {
          if (error instanceof BadCRUDRequestError) {
            return res.badRequest({ body: error });
          }

          if (error instanceof EntityNotFoundError) {
            return res.notFound({ body: error });
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
