/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { fetchSearchResults } from '@kbn/search-index-documents/lib';

import { ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT } from '../../../common/constants';

import { ErrorCode } from '../../../common/types/error_codes';

import type { RouteDependencies } from '../../types';
import { createError } from '../../utils/create_error';
import { elasticsearchErrorHandler } from '../../utils/elasticsearch_error_handler';
import { isIndexNotFoundException } from '../../utils/identify_exceptions';

export function registerSearchRoute({ router, log }: RouteDependencies) {
  router.post(
    {
      path: '/internal/enterprise_search/indices/{index_name}/search',
      validate: {
        body: schema.object({
          searchQuery: schema.string({
            defaultValue: '',
          }),
        }),
        params: schema.object({
          index_name: schema.string(),
        }),
        query: schema.object({
          page: schema.number({ defaultValue: 0, min: 0 }),
          size: schema.number({
            defaultValue: ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT,
            min: 0,
          }),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const indexName = decodeURIComponent(request.params.index_name);
      const searchQuery = request.body.searchQuery;
      const client = (await context.core).elasticsearch.client.asCurrentUser;
      const { page = 0, size = ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT } = request.query;
      const from = page * size;
      try {
        const searchResults = await fetchSearchResults(client, indexName, searchQuery, from, size);

        return response.ok({
          body: {
            results: searchResults,
          },
          headers: { 'content-type': 'application/json' },
        });
      } catch (error) {
        if (isIndexNotFoundException(error)) {
          return createError({
            errorCode: ErrorCode.INDEX_NOT_FOUND,
            message: 'Could not found index',
            response,
            statusCode: 404,
          });
        }
        throw error;
      }
    })
  );
}
