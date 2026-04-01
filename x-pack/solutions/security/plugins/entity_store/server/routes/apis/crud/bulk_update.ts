/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BooleanFromString, buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { unflattenObject } from '@kbn/object-utils';
import { ALL_ENTITY_TYPES, API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { BadCRUDRequestError } from '../../../domain/errors';
import { Entity } from '../../../../common/domain/definitions/entity.gen';

const bodySchema = z.object({
  entities: z.array(
    z.object({
      type: z.enum(ALL_ENTITY_TYPES),
      doc: z.preprocess((val) => unflattenObject(val as Record<string, unknown>), Entity),
    })
  ),
});

const querySchema = z.object({
  force: BooleanFromString.optional().default(false),
});

export function registerCRUDBulkUpdate(router: EntityStorePluginRouter) {
  router.versioned
    .put({
      path: ENTITY_STORE_ROUTES.CRUD_BULK_UPDATE,
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
        const { logger, crudClient } = entityStoreCtx;

        logger.debug('CRUD Bulk Update api called');

        try {
          const errors = await crudClient.bulkUpdateEntity({
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
