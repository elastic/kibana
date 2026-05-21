/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { z } from '@kbn/zod/v4';
import { unflattenObject } from '@kbn/object-utils';
import { ALL_ENTITY_TYPES, API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import {
  BadCRUDRequestError,
  EntityAlreadyExistsError,
  EntityStoreNotInstalledError,
} from '../../../domain/errors';
import { Entity } from '../../../../common/domain/definitions/entity.gen';

const paramsSchema = z.object({
  entityType: z.enum(ALL_ENTITY_TYPES).describe('The entity type to create.'),
});

export function registerCRUDCreate(router: EntityStorePluginRouter) {
  router.versioned
    .post({
      path: ENTITY_STORE_ROUTES.public.CRUD_CREATE,
      access: 'public',
      summary: 'Create an entity',
      description: 'Create a new entity record in the Entity Store for the specified entity type.',
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
            body: buildRouteValidationWithZod(
              z.preprocess((val) => unflattenObject(val as Record<string, unknown>), Entity)
            ),
            params: buildRouteValidationWithZod(paramsSchema),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, '../examples/entities_create.yaml'),
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const { logger, crudClient } = entityStoreCtx;

        logger.debug('CRUD Create api called');

        try {
          await crudClient.createEntity(req.params.entityType, req.body);
        } catch (error) {
          if (error instanceof EntityStoreNotInstalledError) {
            return res.badRequest({ body: error });
          }
          if (error instanceof BadCRUDRequestError) {
            return res.badRequest({ body: error });
          }
          if (error instanceof EntityAlreadyExistsError) {
            return res.conflict({ body: error });
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
