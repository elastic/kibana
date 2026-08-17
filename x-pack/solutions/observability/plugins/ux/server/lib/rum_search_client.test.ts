/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { wrapRumSearchClient } from './rum_search_client';

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
