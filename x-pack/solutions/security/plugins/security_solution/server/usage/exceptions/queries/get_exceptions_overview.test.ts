/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExceptionsOverview } from './get_exceptions_overview';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

describe('getExceptionsOverview', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
  });

  it('returns default metrics when no data is found', async () => {
    esClient.search.mockResolvedValueOnce({
      took: 12,
      timed_out: false,
      _shards: {
        total: 21,
        successful: 21,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 0,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      aggregations: {},
    });

    const result = await getExceptionsOverview({ esClient, logger });

    expect(result).toEqual({
      lists_overview: {
        endpoint: {
          lists: 0,
          total_items: 0,
          max_items_per_list: 0,
          min_items_per_list: 0,
          median_items_per_list: 0,
        },
        rule_default: {
          lists: 0,
          total_items: 0,
          max_items_per_list: 0,
          min_items_per_list: 0,
          median_items_per_list: 0,
        },
        detection: {
          lists: 0,
          total_items: 0,
          max_items_per_list: 0,
          min_items_per_list: 0,
          median_items_per_list: 0,
        },
      },
      items_overview: {
        total: 0,
        has_expire_time: 0,
        are_expired: 0,
        has_comments: 0,
        entries: {
          match: 0,
          list: 0,
          nested: 0,
          match_any: 0,
          exists: 0,
          wildcard: 0,
        },
      },
    });
  });

  it('aggregates metrics correctly when data is present', async () => {
    esClient.search.mockResolvedValueOnce({
      took: 12,
      timed_out: false,
      _shards: {
        total: 21,
        successful: 21,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 3,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      aggregations: {
        agnostic_space_lists: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 'endpoint_list',
              doc_count: 1,
              list_details: {
                doc_count: 1,
                by_type: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'endpoint',
                      doc_count: 1,
                    },
                  ],
                },
              },
              items_entries_type: {
                doc_count: 0,
                by_type: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [],
                },
              },
              non_empty_comments: {
                doc_count: 0,
              },
              expire_time_exists: {
                doc_count: 1,
              },
              expire_time_expired: {
                doc_count: 0,
              },
            },
          ],
        },
        single_space_lists: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: '1caede1b-68e3-4b57-a3e4-b4bf58f3d0cc',
              doc_count: 2,
              list_details: {
                doc_count: 1,
                by_type: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'rule_default',
                      doc_count: 1,
                    },
                  ],
                },
              },
              items_entries_type: {
                doc_count: 1,
                by_type: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'exists',
                      doc_count: 1,
                    },
                    {
                      key: 'match',
                      doc_count: 1,
                    },
                  ],
                },
              },
              non_empty_comments: {
                doc_count: 0,
              },
              expire_time_exists: {
                doc_count: 0,
              },
              expire_time_expired: {
                doc_count: 0,
              },
            },
            {
              key: '4caede1b-68e3-4b57-a3e4-b4bf58f3d022',
              doc_count: 2,
              list_details: {
                doc_count: 1,
                by_type: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'detection',
                      doc_count: 1,
                    },
                  ],
                },
              },
              items_entries_type: {
                doc_count: 1,
                by_type: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'exists',
                      doc_count: 1,
                    },
                    {
                      key: 'match',
                      doc_count: 1,
                    },
                    {
                      key: 'list',
                      doc_count: 1,
                    },
                  ],
                },
              },
              non_empty_comments: {
                doc_count: 4,
              },
              expire_time_exists: {
                doc_count: 2,
              },
              expire_time_expired: {
                doc_count: 1,
              },
            },
            {
              key: '5caede1b-68e3-4b57-a3e4-b4bf58f3d055',
              doc_count: 2,
              list_details: {
                doc_count: 1,
                by_type: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'detection',
                      doc_count: 1,
                    },
                  ],
                },
              },
              items_entries_type: {
                doc_count: 1,
                by_type: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'match_any',
                      doc_count: 1,
                    },
                  ],
                },
              },
              non_empty_comments: {
                doc_count: 1,
              },
              expire_time_exists: {
                doc_count: 0,
              },
              expire_time_expired: {
                doc_count: 0,
              },
            },
            {
              key: '7caede1b-68e3-4b57-a3e4-b4bf58f3d077',
              doc_count: 2,
              list_details: {
                doc_count: 1,
                by_type: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'detection',
                      doc_count: 1,
                    },
                  ],
                },
              },
              items_entries_type: {
                doc_count: 1,
                by_type: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'exists',
                      doc_count: 1,
                    },
                  ],
                },
              },
              non_empty_comments: {
                doc_count: 0,
              },
              expire_time_exists: {
                doc_count: 0,
              },
              expire_time_expired: {
                doc_count: 0,
              },
            },
          ],
        },
      },
    });

    const result = await getExceptionsOverview({ esClient, logger });

    expect(result).toEqual({
      lists_overview: {
        endpoint: {
          lists: 1,
          max_items_per_list: 0,
          median_items_per_list: 0,
          min_items_per_list: 0,
          total_items: 0,
        },
        rule_default: {
          lists: 1,
          max_items_per_list: 1,
          median_items_per_list: 1,
          min_items_per_list: 1,
          total_items: 1,
        },
        detection: {
          lists: 3,
          max_items_per_list: 1,
          median_items_per_list: 1,
          min_items_per_list: 1,
          total_items: 3,
        },
      },
      items_overview: {
        are_expired: 1,
        has_comments: 5,
        has_expire_time: 3,
        total: 4,
        entries: {
          exists: 3,
          list: 1,
          match: 2,
          match_any: 1,
          nested: 0,
          wildcard: 0,
        },
      },
    });
  });

  it('returns default metrics when Elasticsearch query fails', async () => {
    esClient.search.mockRejectedValueOnce(new Error('Elasticsearch query failed'));

    const result = await getExceptionsOverview({ esClient, logger });

    expect(result).toEqual({
      lists_overview: {
        endpoint: {
          lists: 0,
          total_items: 0,
          max_items_per_list: 0,
          min_items_per_list: 0,
          median_items_per_list: 0,
        },
        rule_default: {
          lists: 0,
          total_items: 0,
          max_items_per_list: 0,
          min_items_per_list: 0,
          median_items_per_list: 0,
        },
        detection: {
          lists: 0,
          total_items: 0,
          max_items_per_list: 0,
          min_items_per_list: 0,
          median_items_per_list: 0,
        },
      },
      items_overview: {
        total: 0,
        has_expire_time: 0,
        are_expired: 0,
        has_comments: 0,
        entries: {
          match: 0,
          list: 0,
          nested: 0,
          match_any: 0,
          exists: 0,
          wildcard: 0,
        },
      },
    });
  });
});
