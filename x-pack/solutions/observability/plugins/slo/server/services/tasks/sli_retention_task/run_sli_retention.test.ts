/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformGetTransformResponse } from '@elastic/elasticsearch/lib/api/types';
import {
  elasticsearchClientMock,
  type ElasticsearchClientMock,
} from '@kbn/core-elasticsearch-client-server-mocks';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { runSliRetention } from './run_sli_retention';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-11-17T00:00:00.000Z');

const oldDailyIndices = (count: number) =>
  Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(2024, 0, 2) + i * DAY_MS).toISOString().slice(0, 10);
    return `.slo-observability.sli-v3.6.${date}`;
  });

const transformsResponse = (destIndices: string[]): TransformGetTransformResponse => ({
  count: destIndices.length,
  transforms: destIndices.map((index, i) => ({
    id: `slo-${i}-1`,
    source: { index: ['source'] },
    dest: { index },
  })),
});

describe('runSliRetention', () => {
  let esClient: ElasticsearchClientMock;
  let logger: MockedLogger;
  let abortController: AbortController;

  const run = () =>
    runSliRetention({
      esClient,
      logger,
      signal: abortController.signal,
      now: NOW,
      retentionMs: 180 * DAY_MS,
    });

  const mockIndices = (indices: Array<[string, string]>) =>
    esClient.cat.indices.mockResolvedValue(
      indices.map(([index, docsCount]) => ({ index, 'docs.count': docsCount }))
    );

  beforeEach(() => {
    esClient = elasticsearchClientMock.createElasticsearchClient();
    logger = loggerMock.create();
    abortController = new AbortController();
    esClient.transform.getTransform.mockResolvedValue(
      transformsResponse(['.slo-observability.sli-v3.6'])
    );
    esClient.indices.delete.mockResolvedValue({ acknowledged: true });
  });

  it('lists the SLI indices with their doc count, including hidden indices', async () => {
    mockIndices([]);

    await run();

    expect(esClient.cat.indices).toHaveBeenCalledWith(
      {
        index: '.slo-observability.sli-v3*',
        expand_wildcards: 'all',
        h: ['index', 'docs.count'],
        format: 'json',
      },
      expect.anything()
    );
    expect(esClient.indices.delete).not.toHaveBeenCalled();
  });

  it('deletes aged out, empty and old base indices, keeping the others', async () => {
    mockIndices([
      ['.slo-observability.sli-v3.6.2026-01-02', '100'],
      ['.slo-observability.sli-v3.6.2026-08-01', '0'],
      ['.slo-observability.sli-v3.6.2026-11-17', '0'],
      ['.slo-observability.sli-v3.5', '0'],
      ['.slo-observability.sli-v3.6', '0'],
      ['.slo-observability.sli-v3.6.2026-07-02', '0'],
    ]);

    const deleted = await run();

    expect(deleted).toEqual([
      '.slo-observability.sli-v3.6.2026-01-02',
      '.slo-observability.sli-v3.6.2026-07-02',
      '.slo-observability.sli-v3.5',
    ]);
    expect(esClient.indices.delete).toHaveBeenCalledWith(
      { index: deleted, ignore_unavailable: true, expand_wildcards: 'all' },
      expect.anything()
    );
  });

  it('deletes in chunks of 50 explicit names', async () => {
    const names = oldDailyIndices(120);
    mockIndices(names.map((name) => [name, '1']));

    const deleted = await run();

    expect(deleted).toEqual(names);
    expect(esClient.indices.delete).toHaveBeenCalledTimes(3);
    const chunks = esClient.indices.delete.mock.calls.map(([params]) => params.index);
    expect(chunks.map((chunk) => chunk.length)).toEqual([50, 50, 20]);
    chunks.flat().forEach((name) => {
      expect(name).not.toContain('*');
    });
  });

  it('stops between chunks when aborted', async () => {
    mockIndices(oldDailyIndices(120).map((name) => [name, '1']));
    esClient.indices.delete.mockImplementationOnce(async () => {
      abortController.abort();
      return { acknowledged: true };
    });

    const deleted = await run();

    expect(esClient.indices.delete).toHaveBeenCalledTimes(1);
    expect(deleted).toHaveLength(50);
  });

  it('does not delete anything when the indices cannot be listed', async () => {
    esClient.cat.indices.mockRejectedValue(new Error('forbidden'));

    await expect(run()).rejects.toThrow('forbidden');
    expect(esClient.indices.delete).not.toHaveBeenCalled();
  });

  it('keeps old base indices when the transforms cannot be listed', async () => {
    mockIndices([
      ['.slo-observability.sli-v3.5', '0'],
      ['.slo-observability.sli-v3.6.2026-01-02', '1'],
    ]);
    esClient.transform.getTransform.mockRejectedValue(new Error('forbidden'));

    const deleted = await run();

    expect(deleted).toEqual(['.slo-observability.sli-v3.6.2026-01-02']);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('forbidden'));
  });

  it('keeps old base indices when the transforms list is truncated', async () => {
    mockIndices([['.slo-observability.sli-v3.5', '0']]);
    esClient.transform.getTransform.mockResolvedValue({
      ...transformsResponse(['.slo-observability.sli-v3.6']),
      count: 10001,
    });

    await expect(run()).resolves.toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('1 of 10001'));
  });

  it('deletes an empty old base index when no SLO transform exists', async () => {
    mockIndices([['.slo-observability.sli-v3.5', '0']]);
    // filter_path drops the transforms key when no transform matches.
    esClient.transform.getTransform.mockResolvedValue({
      count: 0,
    } as TransformGetTransformResponse);

    await expect(run()).resolves.toEqual(['.slo-observability.sli-v3.5']);
  });

  it('keeps an old base index a transform writes to', async () => {
    mockIndices([['.slo-observability.sli-v3.5', '0']]);
    esClient.transform.getTransform.mockResolvedValue(
      transformsResponse(['.slo-observability.sli-v3.5'])
    );

    await expect(run()).resolves.toEqual([]);
  });
});
