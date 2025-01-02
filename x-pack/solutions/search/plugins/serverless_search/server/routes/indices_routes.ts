/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesIndexState } from '@elastic/elasticsearch/lib/api/types';
import { schema } from '@kbn/config-schema';

import { fetchSearchResults } from '@kbn/search-index-documents/lib';
import { DEFAULT_DOCS_PER_PAGE } from '@kbn/search-index-documents/types';
import { fetchIndices } from '../lib/indices/fetch_indices';
import { fetchIndex } from '../lib/indices/fetch_index';
import { RouteDependencies } from '../plugin';
import { errorHandler } from '../utils/error_handler';

export const registerIndicesRoutes = ({ logger, router }: RouteDependencies) => {
  router.get(
    {
      path: '/internal/serverless_search/indices',
      validate: {
        query: schema.object({
          from: schema.number({ defaultValue: 0, min: 0 }),
          search_query: schema.maybe(schema.string()),
          size: schema.number({ defaultValue: 20, min: 0 }),
        }),
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const core = await context.core;
      const client = core.elasticsearch.client.asCurrentUser;
      const user = core.security.authc.getCurrentUser();

      if (!user) {
        return response.customError({
          statusCode: 502,
          body: 'Could not retrieve current user, security plugin is not ready',
        });
      }

      const { from, size, search_query: searchQuery } = request.query;

      const indices = await fetchIndices(client, from, size, searchQuery);
      return response.ok({
        body: {
          indices,
        },
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.get(
    {
      path: '/internal/serverless_search/index_names',
      validate: {
        query: schema.object({
          query: schema.maybe(schema.string()),
        }),
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const client = (await context.core).elasticsearch.client.asCurrentUser;

      const result = await client.indices.get({
        expand_wildcards: 'open',
        index: request.query.query ? `*${request.query.query}*` : '*',
      });
      return response.ok({
        body: {
          index_names: Object.keys(result || {}).filter(
            (indexName) => !isHidden(result[indexName]) && !isClosed(result[indexName])
          ),
        },
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.get(
    {
      path: '/internal/serverless_search/index/{indexName}',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const body = await fetchIndex(client.asCurrentUser, request.params.indexName);
      return body
        ? response.ok({
            body,
            headers: { 'content-type': 'application/json' },
          })
        : response.notFound();
    })
  );

  router.post(
    {
      path: '/internal/serverless_search/indices/{index_name}/search',
      validate: {
        body: schema.object({
          searchQuery: schema.string({
            defaultValue: '',
          }),
          trackTotalHits: schema.boolean({ defaultValue: false }),
        }),
        params: schema.object({
          index_name: schema.string(),
        }),
        query: schema.object({
          page: schema.number({ defaultValue: 0, min: 0 }),
          size: schema.number({
            defaultValue: DEFAULT_DOCS_PER_PAGE,
            min: 0,
          }),
        }),
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const client = (await context.core).elasticsearch.client.asCurrentUser;
      const indexName = decodeURIComponent(request.params.index_name);
      const searchQuery = request.body.searchQuery;
      const { page = 0, size = DEFAULT_DOCS_PER_PAGE } = request.query;
      const from = page * size;
      const trackTotalHits = request.body.trackTotalHits;

      const searchResults = await fetchSearchResults(
        client,
        indexName,
        searchQuery,
        from,
        size,
        trackTotalHits
      );

      return response.ok({
        body: {
          results: searchResults,
        },
        headers: { 'content-type': 'application/json' },
      });
    })
  );
};

function isHidden(index?: IndicesIndexState): boolean {
  return index?.settings?.index?.hidden === true || index?.settings?.index?.hidden === 'true';
}
function isClosed(index?: IndicesIndexState): boolean {
  return (
    index?.settings?.index?.verified_before_close === true ||
    index?.settings?.index?.verified_before_close === 'true'
  );
}
