/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createEsResponseError } from '../es_errors.mock';
import { measureSourceVolume } from './measure_source_volume';

const window = { start: '2026-11-03T00:00:00.000Z', end: '2026-11-04T00:00:00.000Z' };

const countOf = (docCount: number) => ({
  columns: [{ name: 'doc_count', type: 'long' }],
  values: [[docCount]],
});

const crossCluster = (
  docs: number | undefined,
  clusters: { total: number; skipped?: number; partial?: number; failed?: number },
  isPartial: boolean
) => ({
  columns: [{ name: 'doc_count', type: 'long' }],
  values: docs === undefined ? [] : [[docs]],
  is_partial: isPartial,
  _clusters: {
    successful: 0,
    running: 0,
    skipped: 0,
    partial: 0,
    failed: 0,
    details: {},
    ...clusters,
  },
});

const statefulStats = (docs: number, bytes: number) => ({
  _shards: { total: 1, successful: 1, failed: 0 },
  _all: {
    primaries: {
      docs: { count: docs, total_size_in_bytes: bytes },
      store: { size_in_bytes: 0, reserved_in_bytes: 0, total_data_set_size_in_bytes: bytes },
    },
  },
});

const setup = ({ esql = 'FROM logs-nginx-* | WHERE status >= 500', isServerless = false } = {}) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const meteringEsClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();
  const measure = () =>
    measureSourceVolume({
      esClient,
      meteringEsClient,
      esql,
      isServerless,
      window,
      signal: new AbortController().signal,
      logger,
    });
  return { esClient, meteringEsClient, logger, measure };
};

describe('measureSourceVolume', () => {
  it('counts the window and sizes the local indices on stateful', async () => {
    const { esClient, measure } = setup();
    esClient.esql.query.mockResolvedValue(countOf(42));
    esClient.indices.stats.mockResolvedValue(statefulStats(1000, 500_000));

    await expect(measure()).resolves.toEqual({
      status: 'ok',
      has_remote: false,
      doc_count: 42,
      bytes_estimated: 21_000,
    });
    expect(esClient.esql.query).toHaveBeenCalledWith(
      {
        query:
          'FROM logs-nginx-* | WHERE status >= 500\n' +
          `| WHERE @timestamp >= "${window.start}" AND @timestamp <= "${window.end}"\n` +
          '| STATS doc_count = COUNT(*)',
        format: 'json',
        include_ccs_metadata: true,
      },
      expect.objectContaining({ requestTimeout: expect.any(Number) })
    );
    expect(esClient.indices.stats).toHaveBeenCalledWith(
      expect.objectContaining({
        index: ['logs-nginx-*'],
      }),
      expect.anything()
    );
  });

  it('counts TS sources through FROM without including standard indices', async () => {
    const { esClient, measure } = setup({
      esql: 'TS metrics-_index_mode-* METADATA _id | WHERE host.name == "a"',
    });
    esClient.esql.query.mockResolvedValue(countOf(42));
    esClient.indices.stats.mockResolvedValue(statefulStats(1000, 500_000));

    await expect(measure()).resolves.toMatchObject({ doc_count: 42 });
    expect(esClient.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({
        query:
          'FROM metrics-_index_mode-* METADATA _id, _index_mode\n' +
          '| WHERE `_index_mode` == "time_series"\n' +
          '| WHERE host.name == "a"\n' +
          `| WHERE @timestamp >= "${window.start}" AND @timestamp <= "${window.end}"\n` +
          '| STATS doc_count = COUNT(*)',
      }),
      expect.anything()
    );
  });

  it('sizes exact expressions with serverless metering stats', async () => {
    const { esClient, meteringEsClient, measure } = setup({
      esql: 'FROM <logs-{now/d}>,-logs-archive-*',
      isServerless: true,
    });
    esClient.esql.query.mockResolvedValue(countOf(42));
    meteringEsClient.transport.request.mockResolvedValue({
      indices: [
        { num_docs: 10, size_in_bytes: 1000 },
        { num_docs: 10, size_in_bytes: 3000 },
      ],
    });

    await expect(measure()).resolves.toMatchObject({ doc_count: 42, bytes_estimated: 8400 });
    expect(meteringEsClient.transport.request).toHaveBeenCalledWith(
      {
        method: 'GET',
        path: `/_metering/stats/${encodeURIComponent('<logs-{now/d}>,-logs-archive-*')}`,
      },
      expect.anything()
    );
    expect(esClient.transport.request).not.toHaveBeenCalled();
    expect(esClient.indices.stats).not.toHaveBeenCalled();
  });

  it('drops the stateful estimate when any index stats shard fails', async () => {
    const { esClient, measure } = setup();
    esClient.esql.query.mockResolvedValue(countOf(42));
    esClient.indices.stats.mockResolvedValue({
      ...statefulStats(1000, 500_000),
      _shards: { total: 2, successful: 1, failed: 1 },
    });

    await expect(measure()).resolves.toEqual({
      status: 'ok',
      has_remote: false,
      doc_count: 42,
    });
    expect(esClient.indices.stats).toHaveBeenCalledWith(
      expect.objectContaining({
        filter_path: expect.arrayContaining(['_shards.failed']),
      }),
      expect.anything()
    );
  });

  it('reports a failed count as an error with the ES error type', async () => {
    const { esClient, measure } = setup();
    esClient.esql.query.mockRejectedValue(
      createEsResponseError(400, 'verification_exception', 'Unknown index [logs-nginx-*]')
    );

    await expect(measure()).resolves.toEqual({
      status: 'error',
      has_remote: false,
      error: 'verification_exception',
    });
    expect(esClient.indices.stats).not.toHaveBeenCalled();
  });

  it('reports a count that timed out', async () => {
    const { esClient, measure } = setup();
    esClient.esql.query.mockRejectedValue(new errors.TimeoutError('timeout', {} as never));

    await expect(measure()).resolves.toMatchObject({ status: 'timeout', error: 'timeout' });
  });

  it('keeps the count and drops the estimate when the size cannot be read', async () => {
    const { esClient, logger, measure } = setup();
    esClient.esql.query.mockResolvedValue(countOf(42));
    esClient.indices.stats.mockRejectedValue(
      createEsResponseError(404, 'index_not_found_exception', 'no such index')
    );
    await expect(measure()).resolves.toEqual({ status: 'ok', has_remote: false, doc_count: 42 });
    expect(logger.warn).not.toHaveBeenCalled();

    esClient.indices.stats.mockRejectedValue(createEsResponseError(403, 'security_exception', ''));
    await expect(measure()).resolves.toEqual({ status: 'ok', has_remote: false, doc_count: 42 });
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('skips the size read for an empty window and for remote-only sources', async () => {
    const empty = setup();
    empty.esClient.esql.query.mockResolvedValue(countOf(0));
    await expect(empty.measure()).resolves.toMatchObject({ doc_count: 0, bytes_estimated: 0 });
    expect(empty.esClient.indices.stats).not.toHaveBeenCalled();

    const remote = setup({ esql: 'FROM remote:logs-*' });
    remote.esClient.esql.query.mockResolvedValue(countOf(7));
    await expect(remote.measure()).resolves.toEqual({
      status: 'ok',
      has_remote: true,
      doc_count: 7,
    });
    expect(remote.esClient.indices.stats).not.toHaveBeenCalled();
  });

  it('reports a partial result with the count as a lower bound and no size estimate', async () => {
    const { esClient, measure } = setup({ esql: 'FROM remote:logs-*' });
    esClient.esql.query.mockResolvedValue(crossCluster(100, { total: 62, skipped: 1 }, true));

    await expect(measure()).resolves.toEqual({
      status: 'partial',
      has_remote: true,
      doc_count: 100,
      clusters_total: 62,
      clusters_unsuccessful: 1,
    });
  });
});
