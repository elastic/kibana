/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ProfilingESField } from '@kbn/profiling-utils';
import type { ProfilingESClient } from '../utils/create_profiling_es_client';
import { topNElasticSearchQuery } from './topn';

const anyQuery = 'any::query';
const smallestInterval = '1s';
const testAgg = { aggs: { test: {} } };

vi.mock('./query', () => {
  const mocked = {
    createCommonFilter: ({}: {}) => {
      return anyQuery;
    },
    findFixedIntervalForBucketsPerTimeRange: (
      from: number,
      to: number,
      buckets: number
    ): string => {
      return smallestInterval;
    },
    aggregateByFieldAndTimestamp: (
      searchField: string,
      interval: string
    ): AggregationsAggregationContainer => {
      return testAgg;
    },
  };
  return { ...mocked, default: mocked };
});

describe('TopN data from Elasticsearch', () => {
  const context = coreMock.createRequestHandlerContext();
  const client: ProfilingESClient = {
    search: vi.fn(
      (operationName, request) =>
        context.elasticsearch.client.asCurrentUser.search(request) as Promise<any>
    ),
    profilingStacktraces: vi.fn(
      (request) =>
        context.elasticsearch.client.asCurrentUser.transport.request({
          method: 'POST',
          path: encodeURI('_profiling/stacktraces'),
          body: {
            query: request.query,
            sample_size: request.sampleSize,
          },
        }) as Promise<any>
    ),
    profilingStatus: vi.fn(
      () =>
        context.elasticsearch.client.asCurrentUser.transport.request({
          method: 'GET',
          path: encodeURI('_profiling/status'),
          body: {},
        }) as Promise<any>
    ),
    getEsClient: vi.fn(() => context.elasticsearch.client.asCurrentUser),
    profilingFlamegraph: vi.fn(
      (request) =>
        context.elasticsearch.client.asCurrentUser.transport.request({
          method: 'POST',
          path: encodeURI('_profiling/flamegraph'),
          body: {
            query: request.query,
            sample_size: request.sampleSize,
          },
        }) as Promise<any>
    ),
    topNFunctions: vi.fn(),
  };
  const logger = loggerMock.create();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when fetching Stack Traces', () => {
    it('should call search twice', async () => {
      await topNElasticSearchQuery({
        client,
        logger,
        timeFrom: 456,
        timeTo: 789,
        searchField: ProfilingESField.StacktraceID,
        highCardinality: false,
        kuery: '',
        showErrorFrames: false,
        preFilterShardSize: 1,
      });

      expect(client.search).toHaveBeenCalledTimes(2);
    });
  });
});
