/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/search-types';
import type { ObservedServiceDetailsRequestOptions } from '../../../../../../../common/api/search_strategy';
import { ServicesQueries } from '../../../../../../../common/search_strategy/security_solution/services';

export const mockOptions: ObservedServiceDetailsRequestOptions = {
  defaultIndex: ['test_indices*'],
  factoryQueryType: ServicesQueries.observedDetails,
  filterQuery:
    '{"bool":{"must":[],"filter":[{"match_all":{}},{"match_phrase":{"service.name":{"query":"test_service"}}}],"should":[],"must_not":[]}}',
  timerange: {
    interval: '12h',
    from: '2020-09-02T15:17:13.678Z',
    to: '2020-09-03T15:17:13.678Z',
  },
  params: {},
  serviceName: 'bastion00.siem.estc.dev',
} as ObservedServiceDetailsRequestOptions;

export const mockSearchStrategyResponse: IEsSearchResponse<unknown> = {
  rawResponse: {
    took: 1,
    timed_out: false,
    _shards: {
      total: 2,
      successful: 2,
      skipped: 1,
      failed: 0,
    },
    hits: {
      max_score: null,
      hits: [],
    },
    aggregations: {
      aggregations: {
        service_id: {
          doc_count_error_upper_bound: -1,
          sum_other_doc_count: 117,
          buckets: [
            {
              key: 'I30s36URfOdZ7gtpC4dum',
              doc_count: 3,
              timestamp: {
                value: 1736851996820,
                value_as_string: '2025-01-14T10:53:16.820Z',
              },
            },
          ],
        },
        service_name: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 'Service-alarm',
              doc_count: 147,
              timestamp: {
                value: 1736851996820,
                value_as_string: '2025-01-14T10:53:16.820Z',
              },
            },
          ],
        },
        service_address: {
          doc_count_error_upper_bound: -1,
          sum_other_doc_count: 117,
          buckets: [
            {
              key: '15.103.138.105',
              doc_count: 3,
              timestamp: {
                value: 1736851996820,
                value_as_string: '2025-01-14T10:53:16.820Z',
              },
            },
          ],
        },
        service_environment: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 'development',
              doc_count: 57,
              timestamp: {
                value: 1736851996820,
                value_as_string: '2025-01-14T10:53:16.820Z',
              },
            },
          ],
        },
        service_ephemeral_id: {
          doc_count_error_upper_bound: -1,
          sum_other_doc_count: 117,
          buckets: [
            {
              key: 'EV8lINfcelHgHrJMwuNvQ',
              doc_count: 3,
              timestamp: {
                value: 1736851996820,
                value_as_string: '2025-01-14T10:53:16.820Z',
              },
            },
          ],
        },
        service_node_name: {
          doc_count_error_upper_bound: -1,
          sum_other_doc_count: 117,
          buckets: [
            {
              key: 'corny-edger',
              doc_count: 3,
              timestamp: {
                value: 1736851996820,
                value_as_string: '2025-01-14T10:53:16.820Z',
              },
            },
          ],
        },
        service_node_roles: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 'data',
              doc_count: 42,
              timestamp: {
                value: 1736851996820,
                value_as_string: '2025-01-14T10:53:16.820Z',
              },
            },
            {
              key: 'ingest',
              doc_count: 54,
              timestamp: {
                value: 1736851996820,
                value_as_string: '2025-01-14T10:53:16.820Z',
              },
            },
            {
              key: 'master',
              doc_count: 51,
              timestamp: {
                value: 1736851996820,
                value_as_string: '2025-01-14T10:53:16.820Z',
              },
            },
          ],
        },
        service_node_role: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 'ingest',
              doc_count: 30,
              timestamp: {
                value: 1736851996820,
                value_as_string: '2025-01-14T10:53:16.820Z',
              },
            },
          ],
        },
        service_state: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 'running',
              doc_count: 51,
              timestamp: {
                value: 1736851996820,
                value_as_string: '2025-01-14T10:53:16.820Z',
              },
            },
          ],
        },
        service_type: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 'system',
              doc_count: 147,
              timestamp: {
                value: 1736851996820,
                value_as_string: '2025-01-14T10:53:16.820Z',
              },
            },
          ],
        },
        service_version: {
          doc_count_error_upper_bound: -1,
          sum_other_doc_count: 117,
          buckets: [
            {
              key: '2.1.9',
              doc_count: 3,
              timestamp: {
                value: 1736851996820,
                value_as_string: '2025-01-14T10:53:16.820Z',
              },
            },
          ],
        },
      },
    },
  },
  isPartial: false,
  isRunning: false,
  total: 2,
  loaded: 2,
};
