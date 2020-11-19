/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const savedSearches = {
  farequoteFilter: {
    indexPatternTitle: 'ft_farequote',
    requestBody: {
      attributes: {
        title: 'ft_farequote_filter',
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
              query: '',
              language: 'lucene',
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
  },
  farequoteLucene: {
    indexPatternTitle: 'ft_farequote',
    requestBody: {
      attributes: {
        title: 'ft_farequote_lucene',
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
              query: 'airline:A*',
              language: 'lucene',
            },
            filter: [],
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
  },
  farequoteKuery: {
    indexPatternTitle: 'ft_farequote',
    requestBody: {
      attributes: {
        title: 'ft_farequote_kuery',
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
              query: 'airline: A* and responsetime > 5',
              language: 'kuery',
            },
            filter: [],
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
  },
  farequoteFilterAndLucene: {
    indexPatternTitle: 'ft_farequote',
    requestBody: {
      attributes: {
        title: 'ft_farequote_filter_and_lucene',
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
              query: 'responsetime:>50',
              language: 'lucene',
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
  },
  farequoteFilterAndKuery: {
    indexPatternTitle: 'ft_farequote',
    requestBody: {
      attributes: {
        title: 'ft_farequote_filter_and_kuery',
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
  },
};

export const dashboards = {
  mlTestDashboard: {
    requestBody: {
      attributes: {
        title: 'ML Test',
        hits: 0,
        description: '',
        panelsJSON: '[]',
        optionsJSON: '{"hidePanelTitles":false,"useMargins":true}',
        version: 1,
        timeRestore: false,
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{"query":{"language":"kuery","query":""},"filter":[]}',
        },
      },
    },
  },
};
