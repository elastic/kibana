/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { resolveEsqlFromClause } from './resolve_esql_from_patterns';

const makeEsClient = (resolveIndex: jest.Mock) =>
  ({ indices: { resolveIndex } } as unknown as ElasticsearchClient);

interface ResolveResponse {
  indices: Array<{ name: string; attributes: string[]; data_stream?: string }>;
  aliases: Array<{ name: string }>;
  data_streams: Array<{ name: string; backing_indices: string[]; timestamp_field: string }>;
}

const emptyResolve: ResolveResponse = { indices: [], aliases: [], data_streams: [] };
const resolveWith = (partial: Partial<ResolveResponse>): ResolveResponse => ({
  ...emptyResolve,
  ...partial,
});

describe('resolveEsqlFromClause', () => {
  const logger = loggerMock.create();
  beforeEach(() => jest.clearAllMocks());

  const run = (resolveIndex: jest.Mock, include: string[], exclude: string[] = []) =>
    resolveEsqlFromClause(makeEsClient(resolveIndex), { include, exclude }, logger);

  it('passes existing patterns through unchanged', async () => {
    const resolveIndex = jest
      .fn()
      .mockResolvedValue(resolveWith({ indices: [{ name: 'logs-a', attributes: ['open'] }] }));

    expect(await run(resolveIndex, ['logs-*', 'logs-a'])).toEqual(['logs-*', 'logs-a']);
  });

  it('drops a concrete index that does not exist, keeps empty wildcards', async () => {
    const resolveIndex = jest.fn().mockResolvedValue(emptyResolve);

    const result = await run(resolveIndex, ['logs-*', 'fluentd-windows-events']);

    expect(result).toEqual(['logs-*']); // wildcard stays, missing concrete dropped
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('fluentd-windows-events'));
  });

  it('negates an exclusion whose target exists', async () => {
    const resolveIndex = jest
      .fn()
      .mockResolvedValue(resolveWith({ indices: [{ name: 'logs-a', attributes: ['open'] }] }));

    expect(await run(resolveIndex, ['logs-*'], ['logs-a'])).toEqual(['logs-*', '-logs-a']);
  });

  it('returns [] when every include is also excluded (no positives left)', async () => {
    const resolveIndex = jest
      .fn()
      .mockResolvedValue(resolveWith({ indices: [{ name: 'logs-a', attributes: ['open'] }] }));

    expect(await run(resolveIndex, ['logs-a'], ['logs-a'])).toEqual([]);
  });

  it('drops a no-op exclusion whose concrete target does not exist', async () => {
    const resolveIndex = jest.fn().mockResolvedValue(emptyResolve);

    expect(await run(resolveIndex, ['logs-*'], ['does-not-exist'])).toEqual(['logs-*']);
  });

  it('reroutes a data stream with a closed backing index', async () => {
    const resolveIndex = jest
      .fn()
      .mockResolvedValueOnce(
        resolveWith({
          data_streams: [
            {
              name: 'logs-ds',
              backing_indices: ['.ds-logs-ds-000001', '.ds-logs-ds-000002'],
              timestamp_field: '@timestamp',
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        resolveWith({
          indices: [
            { name: '.ds-logs-ds-000001', attributes: ['closed'] },
            { name: '.ds-logs-ds-000002', attributes: ['open'] },
          ],
        })
      );

    // the closed data stream is dropped as a positive; its open backing is read and it's negated
    expect(await run(resolveIndex, ['logs-ds'])).toEqual(['.ds-logs-ds-000002', '-logs-ds']);
  });

  it('keeps a data stream whose backing indices are all open untouched', async () => {
    const resolveIndex = jest
      .fn()
      .mockResolvedValueOnce(
        resolveWith({
          data_streams: [
            {
              name: 'logs-ds',
              backing_indices: ['.ds-logs-ds-000001', '.ds-logs-ds-000002'],
              timestamp_field: '@timestamp',
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        resolveWith({
          indices: [
            { name: '.ds-logs-ds-000001', attributes: ['open'] },
            { name: '.ds-logs-ds-000002', attributes: ['open'] },
          ],
        })
      );

    expect(await run(resolveIndex, ['logs-ds'])).toEqual(['logs-ds']);
  });

  it('excludes a closed standalone index', async () => {
    const resolveIndex = jest.fn().mockResolvedValue(
      resolveWith({
        indices: [
          { name: 'standalone-closed', attributes: ['closed'] },
          { name: 'standalone-open', attributes: ['open'] },
        ],
      })
    );

    expect(await run(resolveIndex, ['standalone-*'])).toEqual([
      'standalone-*',
      '-standalone-closed',
    ]);
  });

  it('falls back to the raw patterns on resolve failure', async () => {
    const resolveIndex = jest.fn().mockRejectedValue(new Error('connection refused'));

    expect(await run(resolveIndex, ['logs-*', 'x'])).toEqual(['logs-*', 'x']);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('connection refused'));
  });

  it('returns [] and does not call resolveIndex when include is empty', async () => {
    const resolveIndex = jest.fn();

    expect(await run(resolveIndex, [])).toEqual([]);
    expect(resolveIndex).not.toHaveBeenCalled();
  });

  it('resolves with closed and hidden indices surfaced so they can be handled', async () => {
    const resolveIndex = jest.fn().mockResolvedValue(emptyResolve);

    await run(resolveIndex, ['logs-*']);

    expect(resolveIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        name: ['logs-*'],
        expand_wildcards: ['open', 'closed', 'hidden'],
        ignore_unavailable: true,
        allow_no_indices: true,
      })
    );
  });
});
