/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from './constants';
import { EntityType } from '../domain/definitions/constants';
import type { ResourcesService } from '../domain/resources_service';
import type { EntityStoreLogger } from '../infra/logging';

type QueryParametersSchema = z.infer<typeof QueryParametersSchema>;
const QueryParametersSchema = z.object({
  entityType: z.array(EntityType).optional(),
});

export function registerInstall(
  router: IRouter,
  resourceService: ResourcesService,
  logger: EntityStoreLogger
) {
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
        logger.debug('Install api called');
        resourceService.install(req.query.entityType);

        return res.ok({
          body: {
            ok: true,
          },
        });
      }
    );
}
