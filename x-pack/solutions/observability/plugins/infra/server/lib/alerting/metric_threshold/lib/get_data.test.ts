/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { COMPARATORS } from '@kbn/alerting-comparators';
import type { MetricExpressionParams } from '../../../../../common/alerting/metrics';
import { Aggregators } from '../../../../../common/alerting/metrics';
import { getData } from './get_data';
import { getElasticsearchMetricQuery } from './metric_query';

jest.mock('./metric_query', () => ({
  getElasticsearchMetricQuery: jest.fn(),
}));

const mockedGetElasticsearchMetricQuery = getElasticsearchMetricQuery as jest.MockedFunction<
  typeof getElasticsearchMetricQuery
>;

const params: MetricExpressionParams = {
  metric: 'system.cpu.total.norm.pct',
  aggType: Aggregators.AVERAGE,
  timeSize: 1,
  timeUnit: 'm',
  threshold: [1],
  comparator: COMPARATORS.GREATER_THAN,
};

const logger = { debug: jest.fn(), trace: jest.fn() } as unknown as Logger;

const callGetData = (search: ElasticsearchClient['search'], groupBy?: string | string[]) =>
  getData(
    { search } as ElasticsearchClient,
    params,
    'metrics-*',
    groupBy,
    undefined,
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
      query: { bool: { filter: [] } },
      size: 0,
      aggs: {},
    });
  });

  it('unflattens flat dotted additional context from top_hits _source', async () => {
    const response = await callGetData(
      jest.fn().mockResolvedValue({
        aggregations: {
          groupings: {
            buckets: [
              {
                key: { groupBy0: 'host1' },
                shouldWarn: { value: 0 },
                shouldTrigger: { value: 1 },
                currentPeriod: {
                  buckets: {
                    all: {
                      aggregatedValue: { value: 100 },
                      doc_count: 1,
                    },
                  },
                },
                additionalContext: {
                  hits: {
                    hits: [
                      {
                        _source: {
                          'host.hostname': 'host1',
                          'host.name': 'host1-name',
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
        _shards: {
          successful: 1,
        },
      }),
      'host.hostname'
    );

    expect(response.host1).toEqual(
      expect.objectContaining({
        trigger: true,
        value: 100,
        host: {
          hostname: 'host1',
          name: 'host1-name',
        },
      })
    );
  });

  it('keeps already-nested additional context from top_hits _source', async () => {
    const response = await callGetData(
      jest.fn().mockResolvedValue({
        aggregations: {
          groupings: {
            buckets: [
              {
                key: { groupBy0: 'host1' },
                shouldWarn: { value: 0 },
                shouldTrigger: { value: 1 },
                currentPeriod: {
                  buckets: {
                    all: {
                      aggregatedValue: { value: 100 },
                      doc_count: 1,
                    },
                  },
                },
                additionalContext: {
                  hits: {
                    hits: [
                      {
                        _source: {
                          host: {
                            hostname: 'host1',
                            name: 'host1-name',
                          },
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
        _shards: {
          successful: 1,
        },
      }),
      'host.hostname'
    );

    expect(response.host1).toEqual(
      expect.objectContaining({
        trigger: true,
        value: 100,
        host: {
          hostname: 'host1',
          name: 'host1-name',
        },
      })
    );
  });
});
