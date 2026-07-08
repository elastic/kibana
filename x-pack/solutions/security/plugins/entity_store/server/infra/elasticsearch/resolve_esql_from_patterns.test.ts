/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { resolveFrom, resolveLocalAndRemoteFrom } from './resolve_esql_from_patterns';

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

describe('resolveFrom', () => {
  const logger = loggerMock.create();
  beforeEach(() => jest.clearAllMocks());

  it('passes existing patterns through unchanged', async () => {
    const resolveIndex = jest
      .fn()
      .mockResolvedValue(resolveWith({ indices: [{ name: 'logs-a', attributes: ['open'] }] }));

    const result = await resolveFrom(makeEsClient(resolveIndex), ['logs-*', 'logs-a'], logger);

    expect(result).toEqual(['logs-*', 'logs-a']);
  });

  it('drops a concrete index that does not exist, keeps empty wildcards', async () => {
    const resolveIndex = jest.fn().mockResolvedValue(emptyResolve);

    const result = await resolveFrom(
      makeEsClient(resolveIndex),
      ['logs-*', 'fluentd-windows-events'],
      logger
    );

    expect(result).toEqual(['logs-*']); // wildcard stays, missing concrete dropped
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('fluentd-windows-events'));
  });

  it('falls back to the raw patterns on resolve failure', async () => {
    const resolveIndex = jest.fn().mockRejectedValue(new Error('connection refused'));

    const result = await resolveFrom(makeEsClient(resolveIndex), ['logs-*', 'x'], logger);

    expect(result).toEqual(['logs-*', 'x']);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('connection refused'));
  });

  it('returns [] and does not call resolveIndex when include is empty', async () => {
    const resolveIndex = jest.fn();

    expect(await resolveFrom(makeEsClient(resolveIndex), [], logger)).toEqual([]);
    expect(resolveIndex).not.toHaveBeenCalled();
  });
});

describe('resolveLocalAndRemoteFrom', () => {
  const logger = loggerMock.create();
  beforeEach(() => jest.clearAllMocks());

  const run = (resolveIndex: jest.Mock, include: string[], exclude: string[] = []) =>
    resolveLocalAndRemoteFrom(makeEsClient(resolveIndex), { include, exclude }, logger);

  it('splits local and remote, negating excludes last', async () => {
    const resolveIndex = jest
      .fn()
      .mockResolvedValue(resolveWith({ indices: [{ name: 'logs-a', attributes: ['open'] }] }));

    const { local, remote } = await run(
      resolveIndex,
      ['logs-*', 'remote:logs-*'],
      ['logs-a', 'remote:logs-b']
    );

    expect(local).toEqual(['logs-*', '-logs-a']);
    expect(remote).toEqual(['remote:logs-*', '-remote:logs-b']);
  });

  it('drops a no-op exclusion whose concrete target does not exist', async () => {
    const resolveIndex = jest.fn().mockResolvedValue(emptyResolve);

    const { local } = await run(resolveIndex, ['logs-*'], ['does-not-exist']);

    expect(local).toEqual(['logs-*']); // no dangling `-does-not-exist`
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

    const { local } = await run(resolveIndex, ['logs-ds']);

    // the closed data stream is dropped as a positive; its open backing is read and it's negated
    expect(local).toEqual(['.ds-logs-ds-000002', '-logs-ds']);
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

    const { local } = await run(resolveIndex, ['standalone-*']);

    expect(local).toEqual(['standalone-*', '-standalone-closed']);
  });

  it('excludes the alerts index when it exists (folded in as an exclusion)', async () => {
    const resolveIndex = jest
      .fn()
      .mockResolvedValue(
        resolveWith({ indices: [{ name: '.alerts-security', attributes: ['open'] }] })
      );

    const { local } = await run(resolveIndex, ['logs-*', '.alerts-security'], ['.alerts-security']);

    expect(local).toEqual(['logs-*', '-.alerts-security']);
  });
});
