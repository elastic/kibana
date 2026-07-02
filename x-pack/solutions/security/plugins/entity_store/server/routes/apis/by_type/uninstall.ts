/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { z } from '@kbn/zod/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { buildStrictRouteValidationWithZod } from '../utils/build_strict_route_validation';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../common';
import { EntityType } from '../../../../common/domain/definitions/entity_schema';

const paramsSchema = z.object({
  entityType: EntityType,
});

export function registerUninstallByType(router: EntityStorePluginRouter) {
  router.versioned
    .delete({
      path: ENTITY_STORE_ROUTES.public.UNINSTALL_BY_TYPE,
      access: 'public',
      summary: 'Uninstall a single entity type',
      description:
        'Uninstall a single entity type, removing its engine and associated resources. ' +
        'Uninstalling the last remaining entity type also removes the shared Entity Store ' +
        'resources (global configuration, status/history tasks, entity maintainers) — the ' +
        'same as calling `POST /uninstall` for all types.',
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
          },
        },
        options: {
          oasOperationObject: () =>
            path.join(__dirname, '../examples/entity_store_uninstall_by_type.yaml'),
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const {
          logger,
          assetManagerClient: assetManager,
          entityMaintainersClient,
        } = await ctx.entityStore;
        const { entityType } = req.params;
        logger.debug(`Uninstall by type api called for entity type: ${entityType}`);

        const { engines } = await assetManager.getStatus();
        const isLastEngine = engines.length === 1 && engines[0].type === entityType;

        await assetManager.uninstall(entityType);

        if (isLastEngine) {
          await entityMaintainersClient.removeAll();
        }

        return res.ok({ body: { ok: true } });
      })
    );
}
