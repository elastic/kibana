/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, KibanaRequest } from '@kbn/core/server';

import { ElasticsearchCatalogWriter } from './adapters/elasticsearch_catalog';
import { ExtractionAlreadyRunningError } from './extraction_already_running_error';
import type { ExtractionService } from './extraction_service';

const repositoryIdentity = schema.string({ minLength: 3, maxLength: 256 });
const revision = schema.string({ minLength: 1, maxLength: 255 });

export const registerRoutes = ({
  catalogIndex,
  getServices,
  repositories,
  router,
}: {
  readonly catalogIndex: string;
  readonly getServices: () => {
    readonly extractionService: ExtractionService;
    readonly getSpaceId: (request: KibanaRequest) => string;
  };
  readonly repositories: ReadonlySet<string>;
  readonly router: IRouter;
}): void => {
  router.get(
    {
      path: '/internal/code_intelligence/repositories',
      options: { access: 'internal' },
      security: { authz: { enabled: false, reason: 'This private route is feature gated.' } },
      validate: false,
    },
    async (_context, _request, response) =>
      response.ok({
        body: {
          repositories: [...repositories].sort().map((repository) => ({ repository })),
        },
      })
  );

  router.post(
    {
      path: '/internal/code_intelligence/extractions',
      options: { access: 'internal' },
      security: { authz: { enabled: false, reason: 'This private route is feature gated.' } },
      validate: {
        body: schema.object({ repository: repositoryIdentity, revision }),
      },
    },
    async (context, request, response) => {
      const { extractionService, getSpaceId } = getServices();
      if (!repositories.has(request.body.repository)) {
        return response.badRequest({ body: { message: 'Repository is not configured.' } });
      }
      try {
        const { elasticsearch } = await context.core;
        const id = await extractionService.start(
          request.body.repository,
          request.body.revision,
          request,
          getSpaceId(request),
          new ElasticsearchCatalogWriter(elasticsearch.client.asCurrentUser, catalogIndex)
        );
        return response.accepted({ body: { id } });
      } catch (error) {
        if (error instanceof ExtractionAlreadyRunningError) {
          return response.conflict({ body: { message: error.message } });
        }
        return response.customError({
          statusCode: 429,
          body: { message: error instanceof Error ? error.message : 'Extraction could not start.' },
        });
      }
    }
  );

  router.get(
    {
      path: '/internal/code_intelligence/extractions/{id}',
      options: { access: 'internal' },
      security: { authz: { enabled: false, reason: 'This private route is feature gated.' } },
      validate: {
        params: schema.object({ id: schema.string({ minLength: 36, maxLength: 36 }) }),
      },
    },
    async (_context, request, response) => {
      const { extractionService } = getServices();
      const status = extractionService.get(request.params.id);
      return status === undefined
        ? response.notFound({ body: { message: 'Extraction was not found.' } })
        : response.ok({ body: status });
    }
  );

  router.get(
    {
      path: '/internal/code_intelligence/catalog',
      options: { access: 'internal' },
      security: { authz: { enabled: false, reason: 'This private route is feature gated.' } },
      validate: {
        query: schema.object({
          repository: repositoryIdentity,
          kind: schema.maybe(
            schema.oneOf([schema.literal('log'), schema.literal('trace'), schema.literal('metric')])
          ),
          q: schema.maybe(schema.string({ minLength: 1, maxLength: 512 })),
          page: schema.number({ defaultValue: 1, min: 1, max: 100 }),
          perPage: schema.number({ defaultValue: 25, min: 1, max: 100 }),
        }),
      },
    },
    async (context, request, response) => {
      const { elasticsearch } = await context.core;
      const client = elasticsearch.client.asCurrentUser;
      const filters: object[] = [{ term: { repository: request.query.repository } }];
      if (request.query.kind !== undefined) {
        filters.push({ term: { signal_type: request.query.kind } });
      }
      const { q } = request.query;
      // `title` and `description` are `semantic_text`, which rejects `match`/`multi_match`.
      const textQuery =
        q === undefined
          ? {}
          : {
              should: [
                { semantic: { field: 'title', query: q } },
                { semantic: { field: 'description', query: q } },
                { match: { query: q } },
              ],
              minimum_should_match: 1,
            };
      const result = await client.search<Record<string, unknown>>({
        index: catalogIndex,
        from: (request.query.page - 1) * request.query.perPage,
        size: request.query.perPage,
        query: { bool: { filter: filters, ...textQuery } },
        sort:
          q === undefined
            ? [{ updated_at: 'desc' }, '_doc']
            : ['_score', { updated_at: 'desc' }, '_doc'],
      });
      return response.ok({
        body: {
          page: request.query.page,
          perPage: request.query.perPage,
          total:
            typeof result.hits.total === 'number'
              ? result.hits.total
              : result.hits.total?.value ?? 0,
          items: result.hits.hits.map((hit) => ({ id: hit._id, ...hit._source })),
        },
      });
    }
  );

  router.get(
    {
      path: '/internal/code_intelligence/catalog/{id}',
      options: { access: 'internal' },
      security: { authz: { enabled: false, reason: 'This private route is feature gated.' } },
      validate: {
        params: schema.object({ id: schema.string({ minLength: 1, maxLength: 512 }) }),
      },
    },
    async (context, request, response) => {
      const { elasticsearch } = await context.core;
      const client = elasticsearch.client.asCurrentUser;
      const result = await client.get<Record<string, unknown>>(
        { index: catalogIndex, id: request.params.id },
        { ignore: [404] }
      );
      return result.found
        ? response.ok({ body: { id: result._id, ...result._source } })
        : response.notFound({ body: { message: 'Catalog document was not found.' } });
    }
  );
};
