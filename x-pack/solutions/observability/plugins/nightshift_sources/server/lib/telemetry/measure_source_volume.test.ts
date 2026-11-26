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

const rawAverageOf = (bytes: number) => ({
  columns: [{ name: 'average_raw_bytes', type: 'double' }],
  values: [[bytes]],
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
    esClient.esql.query.mockResolvedValueOnce(countOf(42)).mockResolvedValue(rawAverageOf(2000));
    esClient.indices.stats.mockResolvedValue(statefulStats(1000, 500_000));

    await expect(measure()).resolves.toEqual({
      status: 'ok',
      has_remote: false,
      doc_count: 42,
      raw_bytes_estimated: 84_000,
      disk_bytes_estimated: 21_000,
    });
    expect(esClient.esql.query).toHaveBeenNthCalledWith(
      1,
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
    expect(esClient.esql.query).toHaveBeenNthCalledWith(
      2,
      {
        query:
          'FROM logs-nginx-* METADATA _source\n' +
          '| WHERE status >= 500\n' +
          `| WHERE @timestamp >= "${window.start}" AND @timestamp <= "${window.end}"\n` +
          '| EVAL raw_bytes = BYTE_LENGTH(JSON_EXTRACT(_source, "$"))\n' +
          '| STATS average_raw_bytes = AVG(raw_bytes)',
        format: 'json',
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

  it('samples the raw size of a remote-only source, which has no on-disk estimate', async () => {
    const { esClient, measure } = setup({ esql: 'FROM remote:logs-* METADATA _id, _source' });
    esClient.esql.query
      .mockResolvedValueOnce(countOf(40_000_000))
      .mockResolvedValue(rawAverageOf(1500.4));

    await expect(measure()).resolves.toEqual({
      status: 'ok',
      has_remote: true,
      doc_count: 40_000_000,
      raw_bytes_estimated: 60_016_000_000,
    });
    expect(esClient.esql.query).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query:
          'FROM remote:logs-* METADATA _id, _source\n' +
          `| WHERE @timestamp >= "${window.start}" AND @timestamp <= "${window.end}"\n` +
          '| SAMPLE 0.000250000000\n' +
          '| EVAL raw_bytes = BYTE_LENGTH(JSON_EXTRACT(_source, "$"))\n' +
          '| STATS average_raw_bytes = AVG(raw_bytes)',
      }),
      expect.anything()
    );
    expect(esClient.indices.stats).not.toHaveBeenCalled();
  });

  it('measures the UTF-8 size of fetched documents when the raw size query is rejected', async () => {
    const { esClient, logger, measure } = setup({ esql: 'FROM remote:logs-*' });
    esClient.esql.query
      .mockResolvedValueOnce(countOf(1000))
      .mockRejectedValueOnce(createEsResponseError(400, 'verification_exception', ''))
      .mockResolvedValueOnce({
        columns: [{ name: '_source', type: '_source' }],
        values: [[{ message: 'a' }], [{ message: 'é' }], [null]],
      });

    await expect(measure()).resolves.toMatchObject({ raw_bytes_estimated: 15_500 });
    expect(esClient.esql.query).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: expect.stringMatching(
          /METADATA _source\n.*\n\| SAMPLE 0\.200000000000\n\| LIMIT 400\n\| KEEP _source$/
        ),
      }),
      expect.anything()
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('drops the raw estimate when sampling fails, without a fallback after a timeout', async () => {
    const failing = setup();
    failing.esClient.esql.query
      .mockResolvedValueOnce(countOf(42))
      .mockRejectedValue(createEsResponseError(400, 'verification_exception', ''));
    failing.esClient.indices.stats.mockResolvedValue(statefulStats(1000, 500_000));
    await expect(failing.measure()).resolves.toEqual({
      status: 'ok',
      has_remote: false,
      doc_count: 42,
      disk_bytes_estimated: 21_000,
    });
    expect(failing.esClient.esql.query).toHaveBeenCalledTimes(3);
    expect(failing.logger.warn).toHaveBeenCalledTimes(1);

    const slow = setup();
    slow.esClient.esql.query
      .mockResolvedValueOnce(countOf(42))
      .mockRejectedValue(new errors.TimeoutError('timeout', {} as never));
    slow.esClient.indices.stats.mockResolvedValue(statefulStats(1000, 500_000));
    await expect(slow.measure()).resolves.toMatchObject({ status: 'ok', doc_count: 42 });
    expect(slow.esClient.esql.query).toHaveBeenCalledTimes(2);
  });

  it('counts TS sources through FROM without including standard indices', async () => {
    const { esClient, measure } = setup({
      esql: 'TS metrics-_index_mode-* METADATA _id | WHERE host.name == "a"',
    });
    esClient.esql.query.mockResolvedValueOnce(countOf(42)).mockResolvedValue(rawAverageOf(2000));
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
    expect(esClient.esql.query).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: expect.stringContaining(
          'FROM metrics-_index_mode-* METADATA _id, _source, _index_mode\n' +
            '| WHERE `_index_mode` == "time_series"\n'
        ),
      }),
      expect.anything()
    );
  });

  it('sizes exact expressions with serverless metering stats', async () => {
    const { esClient, meteringEsClient, measure } = setup({
      esql: 'FROM <logs-{now/d}>,-logs-archive-*',
      isServerless: true,
    });
    esClient.esql.query.mockResolvedValueOnce(countOf(42)).mockResolvedValue(rawAverageOf(2000));
    meteringEsClient.transport.request.mockResolvedValue({
      indices: [
        { num_docs: 10, size_in_bytes: 1000 },
        { num_docs: 10, size_in_bytes: 3000 },
      ],
    });

    await expect(measure()).resolves.toMatchObject({ doc_count: 42, disk_bytes_estimated: 8400 });
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
    esClient.esql.query.mockResolvedValueOnce(countOf(42)).mockResolvedValue(rawAverageOf(2000));
    esClient.indices.stats.mockResolvedValue({
      ...statefulStats(1000, 500_000),
      _shards: { total: 2, successful: 1, failed: 1 },
    });

    await expect(measure()).resolves.toEqual({
      status: 'ok',
      has_remote: false,
      doc_count: 42,
      raw_bytes_estimated: 84_000,
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

  it('keeps the count and drops the on-disk estimate when the size cannot be read', async () => {
    const withoutDisk = {
      status: 'ok',
      has_remote: false,
      doc_count: 42,
      raw_bytes_estimated: 84_000,
    };
    const { esClient, logger, measure } = setup();
    esClient.esql.query.mockResolvedValueOnce(countOf(42)).mockResolvedValue(rawAverageOf(2000));
    esClient.indices.stats.mockRejectedValue(
      createEsResponseError(404, 'index_not_found_exception', 'no such index')
    );
    await expect(measure()).resolves.toEqual(withoutDisk);
    expect(logger.warn).not.toHaveBeenCalled();

    esClient.esql.query.mockResolvedValueOnce(countOf(42));
    esClient.indices.stats.mockRejectedValue(createEsResponseError(403, 'security_exception', ''));
    await expect(measure()).resolves.toEqual(withoutDisk);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('skips the size reads for an empty window', async () => {
    const local = setup();
    local.esClient.esql.query.mockResolvedValue(countOf(0));
    await expect(local.measure()).resolves.toMatchObject({
      doc_count: 0,
      raw_bytes_estimated: 0,
      disk_bytes_estimated: 0,
    });
    expect(local.esClient.esql.query).toHaveBeenCalledTimes(1);
    expect(local.esClient.indices.stats).not.toHaveBeenCalled();

    const remote = setup({ esql: 'FROM remote:logs-*' });
    remote.esClient.esql.query.mockResolvedValue(countOf(0));
    await expect(remote.measure()).resolves.toEqual({
      status: 'ok',
      has_remote: true,
      doc_count: 0,
      raw_bytes_estimated: 0,
    });
  });

  it('reports a partial result with the count as a lower bound and no size estimates', async () => {
    const { esClient, measure } = setup({ esql: 'FROM remote:logs-*' });
    esClient.esql.query.mockResolvedValue(crossCluster(100, { total: 62, skipped: 1 }, true));

    await expect(measure()).resolves.toEqual({
      status: 'partial',
      has_remote: true,
      doc_count: 100,
      clusters_total: 62,
      clusters_unsuccessful: 1,
    });
    expect(esClient.esql.query).toHaveBeenCalledTimes(1);
  });
});
