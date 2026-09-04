/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { inspectableEsQueriesMap } from './inspect/inspectable_es_queries_map';
import { wrapInspectableRumSearchClient, wrapRumSearchClient } from './rum_search_client';

const ccs = {
  useAllRemoteClusters: false,
  selectedRemoteClusters: ['ccs'],
};

describe('wrapRumSearchClient', () => {
  it('prefixes search and count index patterns', async () => {
    const search = jest.fn().mockResolvedValue({});
    const count = jest.fn().mockResolvedValue({ count: 0 });
    const client = { search, count, esql: { query: jest.fn() } } as unknown as ElasticsearchClient;
    const wrapped = wrapRumSearchClient(client, ccs);

    await wrapped.search({ index: 'ux-rum-sessions-3' });
    await wrapped.count({ index: 'traces-*.otel-*,logs-*.otel-*' });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'ux-rum-sessions-3,ccs:ux-rum-sessions-3',
        ignore_unavailable: true,
        allow_no_indices: true,
      }),
      undefined
    );
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'traces-*.otel-*,logs-*.otel-*,ccs:traces-*.otel-*,ccs:logs-*.otel-*',
      }),
      undefined
    );
  });

  it('expands ES|QL FROM sources', async () => {
    const query = jest.fn().mockResolvedValue({ columns: [], values: [] });
    const client = {
      search: jest.fn(),
      count: jest.fn(),
      esql: { query },
    } as unknown as ElasticsearchClient;
    const wrapped = wrapRumSearchClient(client, ccs);

    await wrapped.esql.query({ query: 'FROM traces-*.otel-*\n| LIMIT 1' });

    expect(query).toHaveBeenCalledWith(
      { query: 'FROM traces-*.otel-*,ccs:traces-*.otel-*\n| LIMIT 1' },
      undefined
    );
  });
});

describe('wrapInspectableRumSearchClient', () => {
  const request = {
    query: { rangeFrom: 'now-7d' },
    route: { method: 'get', path: '/internal/ux/rum/overview' },
  } as unknown as KibanaRequest;

  afterEach(() => {
    inspectableEsQueriesMap.delete(request);
  });

  it('records search onto the request inspect map', async () => {
    inspectableEsQueriesMap.set(request, []);
    const search = jest.fn().mockResolvedValue({ hits: { hits: [], total: 0 }, took: 3 });
    const wrapped = wrapInspectableRumSearchClient(
      { search, count: jest.fn(), esql: { query: jest.fn() } } as unknown as ElasticsearchClient,
      request
    );

    await wrapped.search({ index: 'ux-rum-sessions-3', size: 0 });

    const recorded = inspectableEsQueriesMap.get(request);
    expect(recorded).toHaveLength(1);
    expect(recorded?.[0].json).toEqual(expect.objectContaining({ index: 'ux-rum-sessions-3' }));
    expect(search).toHaveBeenCalled();
  });

  it('does not record when the request is not inspecting', async () => {
    const search = jest.fn().mockResolvedValue({});
    const wrapped = wrapInspectableRumSearchClient(
      { search, count: jest.fn(), esql: { query: jest.fn() } } as unknown as ElasticsearchClient,
      request
    );

    await wrapped.search({ index: 'ux-rum-sessions-3' });

    expect(inspectableEsQueriesMap.get(request)).toBeUndefined();
  });
});
