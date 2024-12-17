/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { IEsSearchResponse } from '@kbn/search-types';
import { Direction } from '../../../../../../../common/search_strategy';
import { UsersQueries } from '../../../../../../../common/search_strategy/security_solution/users';
import { UsersFields } from '../../../../../../../common/search_strategy/security_solution/users/common';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { createMockEndpointAppContext } from '../../../../../../endpoint/mocks';
import type { UsersRequestOptions } from '../../../../../../../common/api/search_strategy';

export const mockOptions: UsersRequestOptions = {
  defaultIndex: ['test_indices*'],
  factoryQueryType: UsersQueries.users,
  filterQuery:
    '{"bool":{"must":[],"filter":[{"match_all":{}},{"match_phrase":{"user.name":{"query":"test_user"}}}],"should":[],"must_not":[]}}',
  timerange: {
    interval: '12h',
    from: '2020-09-02T15:17:13.678Z',
    to: '2020-09-03T15:17:13.678Z',
  },
  params: {},
  pagination: {
    activePage: 0,
    cursorStart: 0,
    fakePossibleCount: 50,
    querySize: 10,
  },
  sort: { field: UsersFields.name, direction: Direction.asc },
  isNewRiskScoreModuleInstalled: false,
};

export const mockSearchStrategyResponse: IEsSearchResponse<unknown> = {
  rawResponse: {
    took: 2,
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
      user_count: {
        value: 2,
      },
      user_data: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: 'jose52',
            doc_count: 780,
            lastSeen: {
              value: 1644837532000,
              value_as_string: '2022-02-14T11:18:52.000Z',
            },
            domain: {
              hits: {
                total: {
                  value: 780,
                  relation: 'eq',
                },
                max_score: null,
                hits: [
                  {
                    _index: 'endgame-00001',
                    _id: 'inT0934BjUd1_U2597Vf',
                    _score: null,
                    fields: {
                      'user.name': ['jose52'],
                      '@timestamp': ['2022-04-13T17:16:34.540Z'],
                      'user.id': ['17'],
                      'user.email': ['jose52@barrett.com'],
                      'user.domain': ['ENDPOINT-W-8-03'],
                    },
                    sort: [1644837532000],
                  },
                ],
              },
            },
          },
          {
            key: 'danny',
            doc_count: 781,
            lastSeen: {
              value: 1644837532000,
              value_as_string: '2022-02-14T11:18:52.000Z',
            },
            domain: {
              hits: {
                total: {
                  value: 100,
                  relation: 'eq',
                },
                max_score: null,
                hits: [
                  {
                    _index: 'endgame-00001',
                    _id: 'inT0934BjUd1_U2597Vv',
                    _score: null,
                    fields: {
                      'user.name': ['danny'],
                      '@timestamp': ['2022-04-13T17:16:34.540Z'],
                      'user.id': ['18'],
                      'user.email': ['danny@barrett.com'],
                      'user.domain': ['ENDPOINT-W-8-04'],
                    },
                    sort: [1644837532000],
                  },
                ],
              },
            },
          },
        ],
      },
    },
  },
  isPartial: false,
  isRunning: false,
  total: 2,
  loaded: 2,
};

export const mockDeps = () => ({
  esClient: elasticsearchServiceMock.createScopedClusterClient(),
  savedObjectsClient: {} as SavedObjectsClientContract,
  endpointContext: createMockEndpointAppContext(),
  request: {} as KibanaRequest,
  spaceId: 'test-space',
});
