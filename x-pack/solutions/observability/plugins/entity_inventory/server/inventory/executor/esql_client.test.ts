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
  });

  it('turns rows into objects keyed by column name and reads the metadata', async () => {
    const client = setup({
      took: 12,
      is_partial: false,
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
      isPartial: false,
      stats: {
        took: 12,
        documentsFound: 340,
        valuesLoaded: 680,
        rowsEmitted: null,
        cpuNanos: null,
        driverNanos: null,
        bytesRead: null,
        shards: null,
        rowCount: 2,
      },
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
      isPartial: false,
      stats: {
        took: 1,
        documentsFound: 0,
        valuesLoaded: 0,
        rowsEmitted: null,
        cpuNanos: null,
        driverNanos: null,
        bytesRead: null,
        shards: null,
        rowCount: 0,
      },
    });
  });

  it('reports missing metadata as null', async () => {
    const client = setup({ columns: [{ name: 'entity.id', type: 'keyword' }], values: [['a']] });

    const { stats } = await executeEsql(client, query);

    expect(stats).toEqual({
      took: null,
      documentsFound: null,
      valuesLoaded: null,
      rowsEmitted: null,
      cpuNanos: null,
      driverNanos: null,
      bytesRead: null,
      shards: null,
      rowCount: 1,
    });
  });

  // The metadata fields as Elasticsearch 9.7 writes them with `include_execution_metadata: true`.
  it('reads the driver, byte and shard metadata', async () => {
    const client = setup({
      took: 544,
      is_partial: false,
      documents_found: 1,
      values_loaded: 1,
      rows_emitted: 6,
      bytes_read: 3094,
      cpu_nanos: 21765000,
      driver_nanos: 50847500,
      columns: [{ name: '@timestamp', type: 'date' }],
      values: [['2026-11-12T09:34:03.875Z']],
      _clusters: {
        total: 1,
        successful: 1,
        running: 0,
        skipped: 0,
        partial: 0,
        failed: 0,
        details: {
          '(local)': {
            status: 'successful',
            indices: 'metrics-*',
            took: 544,
            _shards: { total: 149, successful: 149, skipped: 0, failed: 0 },
          },
        },
      },
    });

    const { stats } = await executeEsql(client, query);

    expect(stats).toEqual({
      took: 544,
      documentsFound: 1,
      valuesLoaded: 1,
      rowsEmitted: 6,
      cpuNanos: 21765000,
      driverNanos: 50847500,
      bytesRead: 3094,
      shards: { total: 149, successful: 149, skipped: 0, failed: 0 },
      rowCount: 1,
    });
  });

  it('sums the shards of every cluster and leaves a count no cluster reports null', async () => {
    const client = setup({
      columns: [],
      values: [],
      _clusters: {
        total: 3,
        successful: 2,
        running: 0,
        skipped: 1,
        partial: 0,
        failed: 0,
        details: {
          '(local)': {
            status: 'successful',
            indices: 'metrics-*',
            _shards: { total: 3, failed: 1 },
          },
          remote: { status: 'successful', indices: 'metrics-*', _shards: { total: 2, failed: 0 } },
          skipped: { status: 'skipped', indices: 'metrics-*' },
        },
      },
    });

    const { stats } = await executeEsql(client, query);

    expect(stats.shards).toEqual({ total: 5, successful: null, skipped: null, failed: 1 });
  });

  it('reports no shards when the response has no cluster details', async () => {
    const client = setup({ columns: [], values: [], _clusters: { details: {} } });

    const { stats } = await executeEsql(client, query);

    expect(stats.shards).toBeNull();
  });

  it('reports a partial result', async () => {
    const client = setup({
      took: 3,
      is_partial: true,
      columns: [{ name: 'entity.id', type: 'keyword' }],
      values: [['a']],
    });

    const { isPartial } = await executeEsql(client, query);

    expect(isPartial).toBe(true);
  });

  it('treats a response without is_partial as complete', async () => {
    const client = setup({ columns: [{ name: 'entity.id', type: 'keyword' }], values: [['a']] });

    const { isPartial } = await executeEsql(client, query);

    expect(isPartial).toBe(false);
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
