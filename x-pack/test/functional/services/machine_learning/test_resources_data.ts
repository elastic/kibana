/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const savedSearchFarequoteFilter = {
  indexPatternTitle: 'farequote',
  requestBody: {
    attributes: {
      title: 'farequote_filter_and_kuery',
      description: '',
      hits: 0,
      columns: ['_source'],
      sort: ['@timestamp', 'desc'],
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON: {
          highlightAll: true,
          version: true,
          query: {
            query: 'responsetime > 49',
            language: 'kuery',
          },
          filter: [
            {
              meta: {
                index: 'INDEX_PATTERN_ID_PLACEHOLDER',
                negate: false,
                disabled: false,
                alias: null,
                type: 'phrase',
                key: 'airline',
                value: 'ASA',
                params: {
                  query: 'ASA',
                  type: 'phrase',
                },
              },
              query: {
                match: {
                  airline: {
                    query: 'ASA',
                    type: 'phrase',
                  },
                },
              },
              $state: {
                store: 'appState',
              },
            },
          ],
          indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        },
      },
    },
    references: [
      {
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
        id: 'INDEX_PATTERN_ID_PLACEHOLDER',
      },
    ],
  },
};
