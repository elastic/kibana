/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { z } from '@kbn/zod/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { buildStrictRouteValidationWithZod } from '../utils/build_strict_route_validation';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../common';
import { EntityType } from '../../../../common/domain/definitions/entity_schema';
import { enforceEntityStorePrivileges } from '../utils/check_entity_store_privileges';
import { CadenceOverrideSchema } from '../utils/log_extraction_validator';

const paramsSchema = z.object({
  entityType: EntityType.describe('The entity type to update.'),
});

const bodySchema = z.object({
  logExtraction: CadenceOverrideSchema,
});

export function registerUpdateByType(router: EntityStorePluginRouter) {
  router.versioned
    .put({
      path: ENTITY_STORE_ROUTES.public.UPDATE_BY_TYPE,
      access: 'public',
      summary: 'Update a single entity type',
      description:
        'Update the cadence settings (`frequency`, `delay`, `lookbackPeriod`) for a single ' +
        'entity type. Only the fields supplied are changed; there is no way to clear a field ' +
        'back to the shared global value — set it explicitly to the value you want, including ' +
        "the type's default if desired. All other log extraction settings (index patterns, " +
        'volume limits, etc.) remain store-wide only and can be changed via `PUT /update`.',
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
            params: buildStrictRouteValidationWithZod(paramsSchema),
            body: buildStrictRouteValidationWithZod(bodySchema),
          },
        },
        options: {
          oasOperationObject: () =>
            path.join(__dirname, '../examples/entity_store_update_by_type.yaml'),
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const { logger, assetManagerClient: assetManager } = await ctx.entityStore;
        const { entityType } = req.params;
        logger.debug(`Update by type api called for entity type: ${entityType}`);

        const forbidden = await enforceEntityStorePrivileges(assetManager, req, res);
        if (forbidden) return forbidden;

        try {
          await assetManager.updateByType(req, entityType, req.body.logExtraction);
        } catch (error) {
          if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
            return res.badRequest({
              body: { message: `Entity Store engine for type "${entityType}" is not installed` },
            });
          }
          logger.error(error);
          throw error;
        }

        return res.ok({ body: { ok: true } });
      })
    );
}
