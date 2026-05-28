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
import type { RelationshipObservationDoc } from '../../../../common/domain/entity_metadata/relationship_observation';

export const paramsSchema = z.object({
  entityId: z
    .string()
    .min(1)
    .describe('The EUID of the entity to list relationship observations for.'),
});

interface ListRelationshipObservationsResponseBody {
  records: RelationshipObservationDoc[];
  total: number;
  page: number;
  per_page: number;
}

export function registerListRelationships(router: EntityStorePluginRouter) {
  router.versioned
    .get({
      path: ENTITY_STORE_ROUTES.public.LIST_RELATIONSHIP_OBSERVATIONS,
      access: 'public',
      summary: 'List entity relationship observations',
      description:
        'List paginated relationship observations for a given entity. Reads from the metadata datastream with an implicit event.action=relationship_observed filter.',
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
            params: buildRouteValidationWithZod(paramsSchema),
            query: buildRouteValidationWithZod(ListEntityRelationshipsRequestQuery),
          },
        },
      },
      wrapMiddlewares(
        async (
          ctx,
          req,
          res
        ): Promise<IKibanaResponse<ListRelationshipObservationsResponseBody>> => {
          const { logger, crudClient } = await ctx.entityStore;

          logger.debug('List entity relationship observations api called');

          const result = await crudClient.listRelationshipObservations({
            entityId: req.params.entityId,
            ...req.query,
          });

          return res.ok({ body: result });
        }
      )
    );
}
