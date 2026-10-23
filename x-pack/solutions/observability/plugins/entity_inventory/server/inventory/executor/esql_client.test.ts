/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { GeneratedQuery } from '../generator';
import { executeEsql } from './esql_client';

const query: GeneratedQuery = {
  esql: 'FROM metrics-* | WHERE @timestamp >= ?_tstart | LIMIT 10000',
  params: [{ _tstart: '2026-10-22T00:00:00.000Z' }, { _tend: '2026-10-22T01:00:00.000Z' }],
};

const setup = (response: Record<string, unknown>) => {
  const client = elasticsearchServiceMock.createElasticsearchClient();
  // The mock's resolved type is the client's response, which lacks the execution metadata.
  client.esql.query.mockResolvedValue(response as never);
  return client;
};

describe('executeEsql', () => {
  it('sends the query, named params and execution metadata flag without drop_null_columns', async () => {
    const client = setup({ columns: [], values: [] });

    await executeEsql(client, query);

    expect(client.esql.query).toHaveBeenCalledTimes(1);
    const [body] = client.esql.query.mock.calls[0];
    expect(body).toEqual({
      query: query.esql,
      params: query.params,
      include_execution_metadata: true,
    });
    expect(body).not.toHaveProperty('drop_null_columns');
  });

  it('turns rows into objects keyed by column name and reads the metadata', async () => {
    const client = setup({
      took: 12,
      documents_found: 340,
      values_loaded: 680,
      columns: [
        { name: 'entity.id', type: 'keyword' },
        { name: 'cpu', type: 'double' },
        { name: 'host.ip', type: 'ip' },
      ],
      values: [
        ['a', 0.5, ['10.0.0.1', '10.0.0.2']],
        ['b', null, '10.0.0.3'],
      ],
    });

    const result = await executeEsql(client, query);

    expect(result).toEqual({
      columns: [
        { name: 'entity.id', type: 'keyword' },
        { name: 'cpu', type: 'double' },
        { name: 'host.ip', type: 'ip' },
      ],
      rows: [
        { 'entity.id': 'a', cpu: 0.5, 'host.ip': ['10.0.0.1', '10.0.0.2'] },
        { 'entity.id': 'b', cpu: null, 'host.ip': '10.0.0.3' },
      ],
      stats: { took: 12, documentsFound: 340, valuesLoaded: 680, rowCount: 2 },
    });
  });

  it('returns an empty result with its columns', async () => {
    const client = setup({
      took: 1,
      documents_found: 0,
      values_loaded: 0,
      columns: [{ name: 'entity.id', type: 'keyword' }],
      values: [],
    });

    const result = await executeEsql(client, query);

    expect(result).toEqual({
      columns: [{ name: 'entity.id', type: 'keyword' }],
      rows: [],
      stats: { took: 1, documentsFound: 0, valuesLoaded: 0, rowCount: 0 },
    });
  });

  it('reports missing metadata as null', async () => {
    const client = setup({ columns: [{ name: 'entity.id', type: 'keyword' }], values: [['a']] });

    const { stats } = await executeEsql(client, query);

    expect(stats).toEqual({ took: null, documentsFound: null, valuesLoaded: null, rowCount: 1 });
  });

  it('passes the abort signal to the client', async () => {
    const client = setup({ columns: [], values: [] });
    const { signal } = new AbortController();

    await executeEsql(client, query, { signal });

    expect(client.esql.query.mock.calls[0][1]).toEqual({ signal });
  });

  it('throws the client error unchanged', async () => {
    const client = elasticsearchServiceMock.createElasticsearchClient();
    const error = new Error('boom');
    client.esql.query.mockRejectedValue(error);

    await expect(executeEsql(client, query)).rejects.toBe(error);
  });
});
