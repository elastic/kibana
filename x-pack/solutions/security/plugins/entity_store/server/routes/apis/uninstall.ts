/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { z } from '@kbn/zod/v4';
import { buildStrictRouteValidationWithZod } from './utils/build_strict_route_validation';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { ALL_ENTITY_TYPES, EntityType } from '../../../common/domain/definitions/entity_schema';
import { wrapMiddlewares } from '../middleware';

const bodySchema = z.object({
  entityTypes: z
    .array(EntityType)
    .optional()
    .default(ALL_ENTITY_TYPES)
    .describe(
      'Deprecated in 9.6.0. Use `DELETE /uninstall/{entityType}` to uninstall a single entity type. ' +
        'Retained for backward compatibility. Entity types to uninstall; defaults to all installed types.'
    )
    .meta({ deprecated: true }),
});

export function registerUninstall(router: EntityStorePluginRouter) {
  router.versioned
    .post({
      path: ENTITY_STORE_ROUTES.public.UNINSTALL,
      access: 'public',
      summary: 'Uninstall the Entity Store',
      description:
        'Uninstall the Entity Store, removing engines and associated resources for the specified ' +
        'entity types. To remove a single entity type, use `DELETE /uninstall/{entityType}` instead. ' +
        'Uninstalling the last remaining entity type (via either endpoint) removes the shared Entity ' +
        'Store resources as well (global configuration, status/history tasks, entity maintainers).',
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
            body: buildStrictRouteValidationWithZod(bodySchema),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/entity_store_uninstall.yaml'),
        },
      },
      wrapMiddlewares(async (ctx, req, res) => {
        const {
          logger,
          assetManagerClient: assetManager,
          entityMaintainersClient,
        } = await ctx.entityStore;
        const { entityTypes } = req.body;
        logger.debug(`uninstalling entities: [${entityTypes.join(', ')}]`);

        const { engines } = await assetManager.getStatus();
        const installedTypes = new Set(engines.map((e) => e.type));
        const toUninstall = entityTypes.filter((type) => installedTypes.has(type));

        await Promise.all(toUninstall.map((type) => assetManager.uninstall(type)));

        const isFullUninstall = toUninstall.length === engines.length;
        if (isFullUninstall) {
          await entityMaintainersClient.removeAll();
        }

        return res.ok({ body: { ok: true } });
      })
    );
}
