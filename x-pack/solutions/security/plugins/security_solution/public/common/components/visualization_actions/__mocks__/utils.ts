/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const mockRequests = [
  {
    id: '1f18a6f2-3e8c-47d5-9a6c-de756923c9b1',
    description: 'This request queries Elasticsearch to fetch the data for the visualization.',
    searchSessionId: 'a9010976-eed6-4e1a-83d9-79cae01c5dca',
    name: 'Data',
    startTime: 1673260787566,
    status: 1,
    stats: {
      indexFilter: {
        label: 'Index Pattern',
        value: 'auditbeat-*, packetbeat-*',
        description: 'The active index pattern.',
      },
      indexPattern: {
        label: 'Data view',
        value:
          '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*',
        description: 'The data view that was queried.',
      },
      indexPatternId: {
        label: 'Data view ID',
        value: 'security-solution-default',
        description: 'The ID in the .kibana index.',
      },
      requestTimestamp: {
        label: 'Request timestamp',
        value: '2023-01-09T10:39:47.566Z',
        description: 'Time when the start of the request has been logged',
      },
      queryTime: {
        label: 'Query time',
        value: '7ms',
        description:
          'The time it took to process the query. Does not include the time to send the request or parse it in the browser.',
      },
      hitsTotal: {
        label: 'Hits (total)',
        value: '0',
        description: 'The number of documents that match the query.',
      },
      hits: {
        label: 'Hits',
        value: '0',
        description: 'The number of documents returned by the query.',
      },
    },
    json: {
      aggs: {
        '0': {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: '30m',
            time_zone: 'Europe/London',
            min_doc_count: 1,
          },
          aggs: {
            '1-bucket': {
              filter: {
                bool: {
                  must: [],
                  filter: [
                    {
                      bool: {
                        should: [
                          {
                            term: {
                              'event.outcome': 'success',
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                  ],
                  should: [],
                  must_not: [],
                },
              },
            },
          },
        },
      },
      size: 0,
      script_fields: {},
      stored_fields: ['*'],
      runtime_mappings: {},
      _source: {
        excludes: [],
      },
      query: {
        bool: {
          must: [],
          filter: [
            {
              bool: {
                filter: [
                  {
                    term: {
                      'event.category': 'authentication',
                    },
                  },
                ],
              },
            },
            {
              bool: {
                should: [
                  {
                    match_phrase: {
                      _index: 'auditbeat-*',
                    },
                  },
                  {
                    match_phrase: {
                      _index: 'packetbeat-*',
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            {
              range: {
                '@timestamp': {
                  format: 'strict_date_optional_time',
                  gte: '2023-01-09T00:00:00.000Z',
                  lte: '2023-01-09T23:59:59.999Z',
                },
              },
            },
          ],
          should: [],
          must_not: [],
        },
      },
    },
    time: 497,
    response: {
      json: {
        id: 'Fk9GcnByWHZ0U0ItcTVMU2IzSF81MWceZDVFM1N2eVhUaTZpd0lZSkpmQkdrUTo1Nzg4MDY2',
        rawResponse: {
          took: 7,
          timed_out: false,
          _shards: {
            total: 3,
            successful: 3,
            skipped: 1,
            failed: 0,
          },
          hits: {
            total: 0,
            max_score: null,
            hits: [],
          },
          aggregations: {
            '0': {
              buckets: [],
            },
          },
        },
        isPartial: false,
        isRunning: false,
        total: 3,
        loaded: 3,
        isRestored: false,
      },
    },
  },
  {
    id: '2fc0ec00-3775-4050-be70-5c7b902fc34c',
    description: 'This request queries Elasticsearch to fetch the data for the visualization.',
    searchSessionId: 'a9010976-eed6-4e1a-83d9-79cae01c5dca',
    name: 'Data',
    startTime: 1673260787567,
    status: 1,
    stats: {
      indexFilter: {
        label: 'Index Pattern',
        value: 'auditbeat-*, packetbeat-*',
        description: 'The active index pattern.',
      },
      indexPattern: {
        label: 'Data view',
        value:
          '.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*',
        description: 'The data view that was queried.',
      },
      indexPatternId: {
        label: 'Data view ID',
        value: 'security-solution-default',
        description: 'The ID in the .kibana index.',
      },
      requestTimestamp: {
        label: 'Request timestamp',
        value: '2023-01-09T10:39:47.567Z',
        description: 'Time when the start of the request has been logged',
      },
      queryTime: {
        label: 'Query time',
        value: '7ms',
        description:
          'The time it took to process the query. Does not include the time to send the request or parse it in the browser.',
      },
      hitsTotal: {
        label: 'Hits (total)',
        value: '0',
        description: 'The number of documents that match the query.',
      },
      hits: {
        label: 'Hits',
        value: '0',
        description: 'The number of documents returned by the query.',
      },
    },
    json: {
      aggs: {
        '0': {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: '30m',
            time_zone: 'Europe/London',
            min_doc_count: 1,
          },
          aggs: {
            '1-bucket': {
              filter: {
                bool: {
                  must: [],
                  filter: [
                    {
                      bool: {
                        should: [
                          {
                            term: {
                              'event.outcome': 'failure',
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                  ],
                  should: [],
                  must_not: [],
                },
              },
            },
          },
        },
      },
      size: 0,
      script_fields: {},
      stored_fields: ['*'],
      runtime_mappings: {},
      _source: {
        excludes: [],
      },
      query: {
        bool: {
          must: [],
          filter: [
            {
              bool: {
                filter: [
                  {
                    term: {
                      'event.category': 'authentication',
                    },
                  },
                ],
              },
            },
            {
              bool: {
                should: [
                  {
                    match_phrase: {
                      _index: 'auditbeat-*',
                    },
                  },
                  {
                    match_phrase: {
                      _index: 'packetbeat-*',
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            {
              range: {
                '@timestamp': {
                  format: 'strict_date_optional_time',
                  gte: '2023-01-09T00:00:00.000Z',
                  lte: '2023-01-09T23:59:59.999Z',
                },
              },
            },
          ],
          should: [],
          must_not: [],
        },
      },
    },
    time: 489,
    response: {
      json: {
        id: 'FlRQRzRxeWVGUi0yaFRyZTFvX2FaZVEeZDVFM1N2eVhUaTZpd0lZSkpmQkdrUTo1Nzg4MDY4',
        rawResponse: {
          took: 7,
          timed_out: false,
          _shards: {
            total: 3,
            successful: 3,
            skipped: 1,
            failed: 0,
          },
          hits: {
            total: 0,
            max_score: null,
            hits: [],
          },
          aggregations: {
            '0': {
              buckets: [],
            },
          },
        },
        isPartial: false,
        isRunning: false,
        total: 3,
        loaded: 3,
        isRestored: false,
      },
    },
  },
];
