/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedQuery } from '@kbn/data-plugin/public';
import { SAVED_QUERY_BASE_URL } from '@kbn/data-plugin/common/constants';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { rootRequest } from './common';

export const createSavedQuery = (
  title: string,
  query: string,
  filterKey: string = 'agent.hostname'
) =>
  rootRequest<SavedQuery>({
    method: 'POST',
    url: `${SAVED_QUERY_BASE_URL}/_create`,
    body: {
      title,
      description: '',
      query: { query, language: 'kuery' },
      filters: [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: filterKey,
            params: { query: 'localhost' },
          },
          query: { match_phrase: { [filterKey]: 'localhost' } },
        },
      ],
    },
    headers: {
      [ELASTIC_HTTP_VERSION_HEADER]: '1',
    },
  });

export const getSavedQueries = () =>
  rootRequest<{ total: number; savedQueries: SavedQuery[] }>({
    method: 'POST',
    url: `${SAVED_QUERY_BASE_URL}/_find`,
    body: {
      page: 1,
      perPage: 50,
      search: '',
    },
    headers: {
      [ELASTIC_HTTP_VERSION_HEADER]: '1',
    },
  });

export const deleteSavedQueries = () => {
  getSavedQueries().then(($response) => {
    if ($response.body.total !== 0) {
      const savedQueriesId = $response.body.savedQueries.map((savedQuery) => {
        return savedQuery.id;
      });
      savedQueriesId.forEach((id) => {
        rootRequest({
          method: 'DELETE',
          url: `${SAVED_QUERY_BASE_URL}/${id}`,
          headers: {
            [ELASTIC_HTTP_VERSION_HEADER]: '1',
          },
        });
      });
    }
  });
};
