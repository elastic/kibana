/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import {
  normalizeRelationshipRecord,
  type RelationshipRecord,
} from '../../../../common/domain/entity_metadata/relationship_metadata';

// Inline schemas (with `.describe()` calls so the OAS generator picks up
// descriptions at runtime). The generated `ListEntityRelationshipsRequestQuery`
// in list_entity_relationships.gen.ts only emits JSDoc comments — they are
// stripped on every `yarn openapi:generate`. Mirroring the shape here keeps
// per-parameter `description` in the generated OAS spec, which the AJV check
// in `validate_oas_docs.js` requires.
export const paramsSchema = z.object({
  entityId: z
    .string()
    .min(1)
    .max(1000)
    .describe('The EUID of the entity to list relationships for.'),
});

export const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional().describe('Page number to return (1-indexed).'),
  per_page: z.coerce.number().int().min(1).optional().describe('Number of records per page.'),
  sort_field: z.string().max(1000).optional().describe('Field to sort results by.'),
  sort_order: z.enum(['asc', 'desc']).optional().describe('Sort order.'),
  kind: z
    .enum([
      'accesses_frequently',
      'accesses_infrequently',
      'communicates_with',
      'administers',
      'depends_on',
      'owns',
      'supervises',
    ])
    .optional()
    .describe('Relationship kind to filter on.'),
  target: z.string().max(1000).optional().describe('Target EUID to filter on.'),
  from: z
    .string()
    .max(100)
    .datetime()
    .optional()
    .describe('ISO-8601 lower bound for @timestamp.'),
  to: z
    .string()
    .max(100)
    .datetime()
    .optional()
    .describe('ISO-8601 upper bound for @timestamp.'),
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
            query: buildRouteValidationWithZod(querySchema),
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
