/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IRouter } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from './constants';
import { EntityType } from '../domain/definitions/constants';
import type { EntityStorePlugins, TaskManager } from '../types';
import { EntityStoreDependencies } from '../dependencies';
import { getTaskManager } from '../utils';

type QueryParametersSchema = z.infer<typeof QueryParametersSchema>;
const QueryParametersSchema = z.object({
  entityType: z.array(EntityType).optional(),
});

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
  router.versioned
    .post({
      path: '/internal/entity-store/v2/install',
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
            query: buildRouteValidationWithZod(QueryParametersSchema),
          },
        },
      },
      async (ctx, req, res) => {
        const { logger, resourcesService } = dependencies;
        logger.debug('Install api called');
        const types = fallbackTypes(req.query.entityType);
        const taskManager = await getTaskManager(core, plugins);

        await resourcesService.install(types, taskManager);

        return res.ok({
          body: {
            ok: true,
          },
        });
      }
    );
}
