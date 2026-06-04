/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import {
  API_VERSIONS,
  ENTITY_STORE_ROUTES,
  ListEntityRelationshipsRequestQuery,
} from '../../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import {
  normalizeRelationshipRecord,
  type RelationshipRecord,
} from '../../../../common/domain/entity_metadata/relationship_metadata';

export const paramsSchema = z.object({
  entityId: z.string().min(1).describe('The EUID of the entity to list relationships for.'),
});

export type { RelationshipRecord };

interface ListRelationshipMetadataResponseBody {
  records: RelationshipRecord[];
  total: number;
  page: number;
  per_page: number;
}

export function registerListRelationships(router: EntityStorePluginRouter) {
  router.versioned
    .get({
      path: ENTITY_STORE_ROUTES.public.LIST_ENTITY_RELATIONSHIPS,
      access: 'public',
      summary: 'List entity relationships',
      description:
        'List paginated relationship records for a given entity. Reads from the metadata datastream with an implicit event.action=relationship_observed filter.',
      security: {
        authz: DEFAULT_ENTITY_STORE_PERMISSIONS,
      },
      options: {
        tags: ['oas-tag:Security entity store'],
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(paramsSchema),
            query: buildRouteValidationWithZod(ListEntityRelationshipsRequestQuery),
          },
        },
      },
      wrapMiddlewares(
        async (ctx, req, res): Promise<IKibanaResponse<ListRelationshipMetadataResponseBody>> => {
          const { logger, crudClient } = await ctx.entityStore;

          logger.debug('List entity relationships api called');

          const result = await crudClient.listRelationshipMetadata({
            entityId: req.params.entityId,
            ...req.query,
          });

          const records = result.records
            .map(normalizeRelationshipRecord)
            .filter((r): r is RelationshipRecord => r !== undefined);

          return res.ok({
            body: { records, total: result.total, page: result.page, per_page: result.per_page },
          });
        }
      )
    );
}
