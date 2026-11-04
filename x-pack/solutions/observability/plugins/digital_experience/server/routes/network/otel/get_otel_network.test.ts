/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getOtelNetwork } from './get_otel_network';

const PARAMS = { serviceName: 'shop', start: 10, end: 20 };

describe('getOtelNetwork', () => {
  it('searches the OTel logs and traces of the application in parallel, passing the signal', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const resolvers: Array<() => void> = [];
    esClient.search.mockImplementation(() => {
      return new Promise((resolve) => {
        return resolvers.push(() => {
          return resolve({});
        });
      }) as never;
    });
    const signal = new AbortController().signal;

    const result = getOtelNetwork({ esClient, ...PARAMS, signal });
    await Promise.resolve();
    await Promise.resolve();

    // Both searches are in flight before either answers.
    expect(esClient.search).toHaveBeenCalledTimes(2);
    resolvers.forEach((resolve) => {
      return resolve();
    });
    await result;

    expect(
      esClient.search.mock.calls.map(([request]) => {
        return request?.index;
      })
    ).toEqual(['logs-*.otel-*', 'traces-*.otel-*']);
    esClient.search.mock.calls.forEach(([request, options]) => {
      expect(request?.query?.bool?.filter).toContainEqual({ term: { 'service.name': 'shop' } });
      expect(options).toEqual({ signal });
    });
  });

  it('returns empty lists when the indices hold nothing', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue({} as never);

    await expect(getOtelNetwork({ esClient, ...PARAMS })).resolves.toEqual({
      serviceName: 'shop',
      httpRequests: [],
      slowestResources: [],
      pageOrigin: null,
      environments: [],
    });
  });

  it('lists the environments of both the browser logs and the client spans', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const withEnvironment = (environment: string, inEnvironment: object) => {
      return {
        aggregations: {
          environments: { buckets: [] },
          environmentNames: { buckets: [{ key: environment }] },
          environmentNotDefined: { doc_count: 0 },
          inEnvironment,
        },
      } as never;
    };
    esClient.search
      .mockResolvedValueOnce(
        withEnvironment('production', {
          resources: { urls: { buckets: [] } },
          pageLoads: { topPage: { buckets: [] } },
        })
      )
      .mockResolvedValueOnce(withEnvironment('staging', { requests: { buckets: [] } }));

    const { environments } = await getOtelNetwork({ esClient, ...PARAMS });

    expect(environments).toEqual(['production', 'staging']);
  });

  it('fails when a search fails, instead of reporting empty lists', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockRejectedValue(new Error('search_phase_execution_exception'));

    await expect(getOtelNetwork({ esClient, ...PARAMS })).rejects.toThrow(
      'search_phase_execution_exception'
    );
  });
});
