/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ArrayFromString, buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { BadCRUDRequestError } from '../../../domain/errors';
import type { ListEntitiesParams } from '../../../domain/crud/crud_client';

/** `ArrayFromString` expects a Zod schema; align with search / CRUD entity types. */
const entityTypeSchema = z.enum(['user', 'host', 'service', 'generic']);

const querySchema = z
  .object({
    filter: z.string().optional(),
    size: z.coerce.number().int().positive().optional(),
    searchAfter: z.string().optional(),
    source: z.array(z.string()).optional(),
    sort_field: z.string().optional(),
    sort_order: z.enum(['asc', 'desc']).optional(),
    page: z.coerce.number().int().min(1).optional(),
    per_page: z.coerce.number().int().min(1).max(10_000).optional(),
    filterQuery: z.string().optional(),
    entity_types: ArrayFromString(entityTypeSchema).optional(),
  })
  .superRefine((data, ctx) => {
    const usesPagePagination = data.page !== undefined || data.per_page !== undefined;
    const usesSearchAfter = data.searchAfter !== undefined;
    const hasPageModeFields =
      usesPagePagination ||
      data.sort_field !== undefined ||
      data.sort_order !== undefined ||
      data.filterQuery !== undefined ||
      (data.entity_types !== undefined && data.entity_types.length > 0);

    if (usesPagePagination && usesSearchAfter) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cannot combine page/per_page with searchAfter',
      });
    }
    if (usesPagePagination && data.size !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cannot combine page/per_page with size; use per_page for page mode',
      });
    }
    if (data.filter !== undefined && hasPageModeFields) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Cannot combine KQL `filter` with page search parameters (entity_types, filterQuery, page, per_page, sort_field, sort_order)',
      });
    }
  });

const parseJsonParam = <T>(raw: string | undefined, label: string): T | undefined => {
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new BadCRUDRequestError(`Invalid ${label}: must be a valid JSON-encoded value`);
  }
};

const isPageModeQuery = (q: z.infer<typeof querySchema>): boolean =>
  q.page !== undefined ||
  q.per_page !== undefined ||
  q.sort_field !== undefined ||
  q.sort_order !== undefined ||
  q.filterQuery !== undefined ||
  (q.entity_types !== undefined && q.entity_types.length > 0);

export function registerCRUDGet(router: EntityStorePluginRouter) {
  router.versioned
    .get({
      path: ENTITY_STORE_ROUTES.public.CRUD_GET,
      access: 'public',
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
            query: buildRouteValidationWithZod(querySchema),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const { logger, crudClient } = await ctx.entityStore;

        logger.debug('CRUD Get (list entities) api called');

        try {
          if (isPageModeQuery(req.query)) {
            const listParams: ListEntitiesParams = {
              entityTypes: req.query.entity_types ?? [],
              filterQuery: req.query.filterQuery,
              page: req.query.page ?? 1,
              perPage: req.query.per_page ?? 10,
              sortField: req.query.sort_field ?? '@timestamp',
              sortOrder: req.query.sort_order ?? 'desc',
            };

            const result = await crudClient.listEntities(listParams);
            return res.ok({
              body: {
                records: result.entities,
                total: result.total ?? 0,
                page: result.page ?? 1,
                per_page: result.per_page ?? 10,
                inspect: result.inspect,
              },
            });
          }

          let filter;
          try {
            filter = req.query.filter
              ? toElasticsearchQuery(fromKueryExpression(req.query.filter))
              : undefined;
          } catch (error) {
            return res.badRequest({ body: `Invalid filter: ${error.message}` });
          }

          const listParams: ListEntitiesParams = {
            filter,
            size: req.query.size,
            searchAfter: parseJsonParam<Array<string | number>>(
              req.query.searchAfter,
              'searchAfter'
            ),
            source: req.query.source,
          };

          const { entities, nextSearchAfter } = await crudClient.listEntities(listParams);
          return res.ok({ body: { entities, nextSearchAfter } });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (message.startsWith('Invalid filterQuery')) {
            return res.badRequest({ body: { message } });
          }
          if (error instanceof BadCRUDRequestError) {
            return res.badRequest({ body: error });
          }

          logger.error(error);
          throw error;
        }
      })
    );
}
