/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
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
    filter: z
      .string()
      .optional()
      .describe('A Kibana Query Language (KQL) filter for the search-after mode.'),
    size: z.coerce
      .number()
      .int()
      .min(1)
      .optional()
      .describe('Number of entities to return in search-after mode.'),
    searchAfter: z
      .string()
      .optional()
      .describe('JSON-encoded search_after value for cursor-based pagination.'),
    source: z.array(z.string()).optional().describe('Fields to include in the response source.'),
    fields: ArrayFromString(z.string()).optional().describe('Fields to include in the response.'),
    sort_field: z.string().optional().describe('Field to sort results by in page mode.'),
    sort_order: z.enum(['asc', 'desc']).optional().describe('Sort order in page mode.'),
    page: z.coerce
      .number()
      .int()
      .min(1)
      .optional()
      .describe('Page number to return (1-indexed) in page mode.'),
    per_page: z.coerce
      .number()
      .int()
      .min(1)
      .max(10_000)
      .optional()
      .describe('Number of entities per page in page mode.'),
    filterQuery: z
      .string()
      .optional()
      .describe('An Elasticsearch query string to filter entities in page mode.'),
    entity_types: ArrayFromString(entityTypeSchema)
      .optional()
      .describe('Entity types to include in the results.'),
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
      summary: 'List entities',
      description:
        'List entity records from the Entity Store with paging, sorting, and filtering. Supports two modes: page-based pagination (page/per_page) and cursor-based pagination (searchAfter). The two modes cannot be combined.',
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
            query: buildRouteValidationWithZod(querySchema),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, '../examples/entities_list.yaml'),
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
            fields: req.query.fields,
          };

          const { entities, nextSearchAfter, fields } = await crudClient.listEntities(listParams);
          return res.ok({
            body: { entities, nextSearchAfter, ...(fields ? { fields } : {}) },
          });
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
