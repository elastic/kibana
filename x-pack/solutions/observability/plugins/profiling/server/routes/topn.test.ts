/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  PROFILING_EVENTS_INDEX_BY_SCHEMA,
  ProfilingESField,
  ProfilingSchema,
} from '@kbn/profiling-utils';
import type { ProfilingESClient } from '@kbn/profiling-data-access-plugin/server';
import { getRoutePaths } from '../../common';
import type { RouteRegisterParameters } from '.';
import { registerTraceEventsTopNHostsSearchRoute, topNElasticSearchQuery } from './topn';

const anyQuery = 'any::query';
const smallestInterval = '1s';
const testAgg = { aggs: { test: {} } };

jest.mock('./query', () => ({
  createCommonFilter: ({}: {}) => {
    return anyQuery;
  },
  findFixedIntervalForBucketsPerTimeRange: (from: number, to: number, buckets: number): string => {
    return smallestInterval;
  },
  aggregateByFieldAndTimestamp: (
    searchField: string,
    interval: string
  ): AggregationsAggregationContainer => {
    return testAgg;
  },
}));

describe('TopN data from Elasticsearch', () => {
  const context = coreMock.createRequestHandlerContext();
  const client: ProfilingESClient = {
    search: jest.fn(
      (operationName, request) =>
        context.elasticsearch.client.asCurrentUser.search(request) as Promise<any>
    ),
    profilingStacktraces: jest.fn(
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
    getEsClient: jest.fn(() => context.elasticsearch.client.asCurrentUser),
    profilingFlamegraph: jest.fn(
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
    topNFunctions: jest.fn(),
    universalProfiling: {
      status: jest.fn(
        () =>
          context.elasticsearch.client.asCurrentUser.transport.request({
            method: 'GET',
            path: encodeURI('_profiling/status'),
            body: {},
          }) as Promise<any>
      ),
    },
  };
  const logger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
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
        profilingSchema: ProfilingSchema.ECS,
      });

      expect(client.search).toHaveBeenCalledTimes(2);
    });
  });
});

// Without events in the down-sampled index, the TopN histogram is computed from the full events index
function createSchemaClient() {
  return {
    search: jest.fn(async (operationName: string) =>
      operationName === 'find_downsampled_index'
        ? { hits: { total: { value: 0 } } }
        : {
            aggregations: {
              group_by: {
                buckets: [
                  {
                    key: 'stacktrace-id',
                    doc_count: 1,
                    count: { value: 1 },
                    over_time: { buckets: [] },
                  },
                ],
              },
              over_time: { buckets: [] },
              total_count: { value: 1 },
            },
          }
    ),
    profilingStacktraces: jest.fn().mockResolvedValue({ sampling_rate: 1 }),
  };
}

describe('topNElasticSearchQuery', () => {
  const queryTopN = ({
    client,
    searchField,
    schema,
  }: {
    client: ReturnType<typeof createSchemaClient>;
    searchField: string;
    schema: ProfilingSchema;
  }) =>
    topNElasticSearchQuery({
      client: client as unknown as ProfilingESClient,
      logger: loggerMock.create(),
      timeFrom: 456,
      timeTo: 789,
      searchField,
      highCardinality: false,
      kuery: '',
      showErrorFrames: false,
      profilingSchema: schema,
    });

  it.each([
    [ProfilingSchema.ECS, 'profiling-events-5pow06', 'profiling-events-all'],
    [ProfilingSchema.OTEL, 'profiling-events-5pow06.otel-*', 'profiling-events-all.otel-*'],
  ])(
    'queries the events indices of the %s schema',
    async (schema, downsampledIndex, fullEventsIndex) => {
      const client = createSchemaClient();

      await queryTopN({ client, searchField: ProfilingESField.HostID, schema });

      expect(client.search).toHaveBeenNthCalledWith(
        1,
        'find_downsampled_index',
        expect.objectContaining({ index: downsampledIndex })
      );
      expect(client.search).toHaveBeenNthCalledWith(
        2,
        'get_topn_histogram',
        expect.objectContaining({ index: fullEventsIndex })
      );
    }
  );

  it.each([ProfilingSchema.ECS, ProfilingSchema.OTEL])(
    'looks up the stacktraces in the %s schema',
    async (schema) => {
      const client = createSchemaClient();

      await queryTopN({ client, searchField: ProfilingESField.StacktraceID, schema });

      expect(client.profilingStacktraces).toHaveBeenCalledWith(expect.objectContaining({ schema }));
    }
  );
});

describe('registerTraceEventsTopNHostsSearchRoute', () => {
  function setup() {
    const router = httpServiceMock.createRouter();
    const client = createSchemaClient();

    registerTraceEventsTopNHostsSearchRoute({
      router,
      logger: loggerMock.create(),
      services: { createProfilingEsClient: () => client },
      dependencies: { esCapabilities: { serverless: false } },
    } as unknown as RouteRegisterParameters);

    const routeEntry = router.get.mock.calls.find(
      ([{ path }]) => path === getRoutePaths().TopNHosts
    );
    const handler = routeEntry?.[1] as (...args: unknown[]) => Promise<unknown>;

    const context = coreMock.createCustomRequestHandlerContext({
      core: coreMock.createRequestHandlerContext(),
    });
    const response = httpServerMock.createResponseFactory();

    return {
      client,
      response,
      getTopNHosts: (schema?: ProfilingSchema) =>
        handler(
          context,
          httpServerMock.createKibanaRequest({
            query: { timeFrom: 1_700_000_000, timeTo: 1_700_000_900, kuery: '', schema },
          }),
          response
        ),
    };
  }

  it.each([ProfilingSchema.ECS, ProfilingSchema.OTEL])(
    'queries the events of the %s schema',
    async (schema) => {
      const { getTopNHosts, client, response } = setup();

      await getTopNHosts(schema);

      expect(response.ok).toHaveBeenCalled();
      expect(client.search).toHaveBeenCalledWith(
        'get_topn_histogram',
        expect.objectContaining({ index: PROFILING_EVENTS_INDEX_BY_SCHEMA[schema] })
      );
    }
  );

  it('queries the Universal Profiling events when no schema is requested', async () => {
    const { getTopNHosts, client, response } = setup();

    await getTopNHosts();

    expect(response.ok).toHaveBeenCalled();
    expect(client.search).toHaveBeenCalledWith(
      'get_topn_histogram',
      expect.objectContaining({ index: PROFILING_EVENTS_INDEX_BY_SCHEMA[ProfilingSchema.ECS] })
    );
  });
});
