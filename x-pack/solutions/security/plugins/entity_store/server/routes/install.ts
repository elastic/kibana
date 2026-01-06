/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

<<<<<<< HEAD
import type { CoreSetup, IRouter } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from './constants';
import { EntityType } from '../domain/definitions/constants';
import type { EntityStorePlugins, TaskManager } from '../types';
import { EntityStoreDependencies } from '../dependencies';
import { getTaskManager } from '../utils';
=======
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from './constants';
import { EntityType } from '../domain/definitions/entity_type';
import type { EntityStorePluginRouter } from '../types';
>>>>>>> romulets/entity-store/v2-enablement-api

const bodySchema = z.object({
  entityType: z.array(EntityType).optional(),
});

<<<<<<< HEAD
const fallbackTypes = (types?: EntityType[]): EntityType[] => {
  if (!types) {
    return Object.values(EntityType.Values);
  }

  return types;
};

export function registerInstall({ router, dependencies, plugins, core }: {
  router: IRouter,
  dependencies: EntityStoreDependencies,
  plugins: EntityStorePlugins,
  core: CoreSetup
}) {
=======
export function registerInstall(router: EntityStorePluginRouter) {
>>>>>>> romulets/entity-store/v2-enablement-api
  router.versioned
    .post({
      path: '/internal/security/entity-store/install',
      access: 'internal',
      security: {
        authz: DEFAULT_ENTITY_STORE_PERMISSIONS,
      },
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
      async (ctx, req, res) => {
<<<<<<< HEAD
        const { logger, resourcesService } = dependencies;
        logger.debug('Install api called');
        const types = fallbackTypes(req.query.entityType);
        const taskManager = await getTaskManager(core, plugins);

        await resourcesService.install(types, taskManager);
=======
        const entityStoreCtx = await ctx.entityStore;
        const logger = entityStoreCtx.getLogger();
        const resourcesService = entityStoreCtx.getResourcesService();

        logger.debug('Install api called');
        resourcesService.install(req.body.entityType);
>>>>>>> romulets/entity-store/v2-enablement-api

        return res.ok({
          body: {
            ok: true,
          },
        });
      }
    );
}
