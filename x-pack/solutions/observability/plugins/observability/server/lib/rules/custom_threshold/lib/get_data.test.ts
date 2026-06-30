/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { COMPARATORS } from '@kbn/alerting-comparators';
import type {
  CustomMetricExpressionParams,
  SearchConfigurationType,
} from '../../../../../common/custom_threshold_rule/types';
import { Aggregators } from '../../../../../common/custom_threshold_rule/types';
import { UNGROUPED_FACTORY_KEY } from '../constants';
import { getData } from './get_data';
import { getElasticsearchMetricQuery } from './metric_query';

jest.mock('./metric_query', () => ({
  getElasticsearchMetricQuery: jest.fn(),
}));

const mockedGetElasticsearchMetricQuery = getElasticsearchMetricQuery as jest.MockedFunction<
  typeof getElasticsearchMetricQuery
>;

const params: CustomMetricExpressionParams = {
  metrics: [
    {
      name: 'A',
      aggType: Aggregators.LAST_VALUE,
      field: 'system.cpu.total.norm.pct',
    },
  ],
  timeSize: 1,
  timeUnit: 'm',
  threshold: [1],
  comparator: COMPARATORS.GREATER_THAN,
};

const searchConfiguration: SearchConfigurationType = {
  index: {
    index: {
      id: 'metrics-*',
      name: 'Metrics',
      timeFieldName: '@timestamp',
      title: 'metrics-*',
    },
  },
  query: {
    language: 'kuery',
    query: '',
  },
};

const esQueryConfig = {
  allowLeadingWildcards: true,
  queryStringOptions: {},
  ignoreFilterIfFieldNotInIndex: false,
};

const logger = { debug: jest.fn() } as unknown as Logger;

const expectedNoDataResponse = {
  [UNGROUPED_FACTORY_KEY]: {
    value: null,
    trigger: false,
    bucketKey: { groupBy0: UNGROUPED_FACTORY_KEY },
  },
};

const callGetData = (search: ElasticsearchClient['search'], groupBy?: string | string[]) =>
  getData(
    { search } as ElasticsearchClient,
    params,
    'metrics-*',
    '@timestamp',
    groupBy,
    searchConfiguration,
    undefined,
    esQueryConfig,
    100,
    false,
    { start: 0, end: 1 },
    logger
  );

describe('getData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetElasticsearchMetricQuery.mockReturnValue({
      track_total_hits: true,
      query: { bool: { must: [], must_not: [], filter: [], should: [] } },
      size: 0,
      aggs: {},
    });
  });

  it('returns no data when a last value aggregation has no numeric bucket path value', async () => {
    const response = await callGetData(
      jest.fn().mockRejectedValue({
        meta: {
          body: {
            error: {
              type: 'search_phase_execution_exception',
              reason: 'all shards failed',
              root_cause: [
                {
                  type: 'illegal_argument_exception',
                  reason:
                    'buckets_path must reference either a number value or a single value numeric metric aggregation',
                },
              ],
            },
          },
        },
      })
    );

    expect(response).toEqual(expectedNoDataResponse);
  });

  it('returns no data when a last value no-data error is surfaced as a message', async () => {
    const response = await callGetData(
      jest.fn().mockRejectedValue({
        message:
          'buckets_path must reference either a number value or a single value numeric metric aggregation',
      })
    );

    expect(response).toEqual(expectedNoDataResponse);
  });

  it('returns no data when a grouped search has no buckets', async () => {
    const response = await callGetData(
      jest.fn().mockResolvedValue({
        aggregations: {
          groupings: {
            buckets: [],
          },
        },
        _shards: {
          successful: 1,
        },
      }),
      'host.name'
    );

    expect(response).toEqual(expectedNoDataResponse);
  });

  it('throws other Elasticsearch errors', async () => {
    const error = new Error('Elasticsearch failed for another reason');

    await expect(callGetData(jest.fn().mockRejectedValue(error))).rejects.toThrow(error);
  });
});
