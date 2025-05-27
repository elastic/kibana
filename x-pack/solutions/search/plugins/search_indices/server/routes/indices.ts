/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { DEFAULT_DOCS_PER_PAGE } from '@kbn/search-index-documents/types';
import { fetchSearchResults } from '@kbn/search-index-documents/lib';

import { POST_CREATE_INDEX_ROUTE, SEARCH_DOCUMENTS_ROUTE } from '../../common/routes';
import { CreateIndexRequest } from '../../common/types';
import { createIndex } from '../lib/indices';

export function registerIndicesRoutes(router: IRouter, logger: Logger) {
  router.post(
    {
      path: POST_CREATE_INDEX_ROUTE,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {
        body: schema.object({
          indexName: schema.string(),
        }),
      },
      options: {
        access: 'internal',
      },
    },
    async (context, request, response) => {
      const core = await context.core;
      const client = core.elasticsearch.client.asCurrentUser;
      const data: CreateIndexRequest = request.body;

      try {
        const body = await createIndex(client, logger, data);
        return response.ok({
          body,
          headers: { 'content-type': 'application/json' },
        });
      } catch (e) {
        switch (e?.meta?.body?.error?.type) {
          case 'resource_already_exists_exception':
            return response.conflict({
              body: {
                message: e.message,
              },
            });
        }

        return response.customError({
          statusCode: e?.meta && e.meta?.statusCode ? e.meta?.statusCode : 500,
          body: {
            message: i18n.translate('xpack.searchIndices.server.createIndex.errorMessage', {
              defaultMessage: 'Failed to create index due to an exception.\n{errorMessage}',
              values: {
                errorMessage: e.message,
              },
            }),
          },
        });
      }
    }
  );

  router.post(
    {
      path: SEARCH_DOCUMENTS_ROUTE,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {
        body: schema.object({
          searchQuery: schema.string({
            defaultValue: '',
          }),
          trackTotalHits: schema.boolean({ defaultValue: false }),
        }),
        params: schema.object({
          indexName: schema.string(),
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
    async (context, request, response) => {
      const client = (await context.core).elasticsearch.client.asCurrentUser;
      const indexName = decodeURIComponent(request.params.indexName);
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
    }
  );
}
