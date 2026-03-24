/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { fromKueryExpression, KQLSyntaxError, toElasticsearchQuery } from '@kbn/es-query';
import { ENTITY_STORE_ROUTES } from '../../../../common';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { BadCRUDRequestError } from '../../../domain/errors';
import type { ListEntitiesParams } from '../../../domain/crud/crud_client';

const querySchema = z.object({
  filter: z.string().optional(),
  size: z.coerce.number().int().positive().optional(),
  searchAfter: z.string().optional(),
});

const parseJsonParam = <T>(raw: string | undefined, label: string): T | undefined => {
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new BadCRUDRequestError(`Invalid ${label}: must be a valid JSON-encoded value`);
  }
};

export function registerCRUDGet(router: EntityStorePluginRouter) {
  router.versioned
    .get({
      path: ENTITY_STORE_ROUTES.CRUD_GET,
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
            query: buildRouteValidationWithZod(querySchema),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const { logger, crudClient } = await ctx.entityStore;

        logger.debug('CRUD Get api called');

        const filter = req.query.filter
          ? toElasticsearchQuery(fromKueryExpression(req.query.filter))
          : undefined;
        try {
          const listParams: ListEntitiesParams = {
            filter,
            size: req.query.size,
            searchAfter: parseJsonParam<Array<string | number>>(
              req.query.searchAfter,
              'searchAfter'
            ),
          };

          const { entities, nextSearchAfter } = await crudClient.listEntities(listParams);
          return res.ok({ body: { entities, nextSearchAfter } });
        } catch (error) {
          if (error instanceof BadCRUDRequestError || error instanceof KQLSyntaxError) {
            return res.badRequest({ body: error });
          }

          logger.error(error);
          throw error;
        }
      })
    );
}
