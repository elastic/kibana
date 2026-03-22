/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ArrayFromString, buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { ENTITY_STORE_ROUTES } from '../../../common';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import { searchEntitiesV2 } from '../../domain/search_entities/search_entities';

/** `ArrayFromString` expects a Zod schema; `EntityType` from `common/index` is type-only at runtime. */
const entityTypeSchema = z.enum(['user', 'host', 'service', 'generic']);

const SearchEntitiesRequestQuery = z.object({
  sort_field: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  per_page: z.coerce.number().int().min(1).max(10_000).optional(),
  filterQuery: z.string().optional(),
  entity_types: ArrayFromString(entityTypeSchema).optional(),
});

export function registerSearchEntities(router: EntityStorePluginRouter) {
  router.versioned
    .get({
      path: ENTITY_STORE_ROUTES.SEARCH_ENTITIES,
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
            query: buildRouteValidationWithZod(SearchEntitiesRequestQuery),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const { logger, core, namespace } = entityStoreCtx;
        const esClient = core.elasticsearch.client.asCurrentUser;

        const {
          page = 1,
          per_page: perPage = 10,
          sort_field: sortField = '@timestamp',
          sort_order: sortOrder = 'desc',
          entity_types: entityTypesFromQuery,
          filterQuery,
        } = req.query;
        const entityTypes = entityTypesFromQuery ?? [];

        logger.debug('Entity store search entities (v2) api called');

        try {
          const { records, total, inspect } = await searchEntitiesV2({
            esClient,
            namespace,
            entityTypes,
            filterQuery,
            page,
            perPage,
            sortField,
            sortOrder,
          });

          return res.ok({
            body: {
              records,
              total,
              page,
              per_page: perPage,
              inspect,
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (message.startsWith('Invalid filterQuery')) {
            return res.badRequest({ body: { message } });
          }
          logger.error(error);
          throw error;
        }
      })
    );
}
