/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { clearFeedCache, getCachedFeed, setCachedFeed } from '../../../lib/feeds/feed_cache';
import { downloadFeed } from '../../../lib/feeds/fetch';
import { readInventory } from '../../../lib/scan';
import type { InventorySnapshot } from '../../../lib/scan';
import { buildContext, buildDeps } from '../test_helpers';
import { bodySha256, buildFetchFeedStepDefinition } from './fetch_feed_step';

jest.mock('../../../lib/feeds/fetch', () => ({
  ...jest.requireActual('../../../lib/feeds/fetch'),
  downloadFeed: jest.fn(),
}));
jest.mock('../../../lib/scan', () => ({
  ...jest.requireActual('../../../lib/scan'),
  readInventory: jest.fn(),
}));

const downloadMock = downloadFeed as jest.MockedFunction<typeof downloadFeed>;
const inventoryMock = readInventory as jest.MockedFunction<typeof readInventory>;

const ubuntuHost = { inventory: { os: { family: 'ubuntu', version: 'noble' } } };
const rhelHost = { inventory: { os: { family: 'rhel', version: '9' } } };

const snapshot = (hosts: unknown[], packMissing = false): InventorySnapshot => ({
  hosts: hosts as InventorySnapshot['hosts'],
  skippedHosts: {},
  skippedRows: {},
  packMissing,
});

const run = async (signal?: AbortSignal) => {
  const { deps } = buildDeps();
  const result = await buildFetchFeedStepDefinition(deps).handler(buildContext({}, signal));
  return { result, deps };
};

describe('native_vuln.fetch_feed handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearFeedCache();
  });

  it('downloads each release once and keeps only metadata in the output', async () => {
    inventoryMock.mockResolvedValue(snapshot([ubuntuHost, ubuntuHost, rhelHost]));
    downloadMock.mockImplementation(async (os) => ({
      status: 'ok',
      body: new Uint8Array(10),
      etag: `"${os.family}"`,
      lastModified: 'Fri, 13 Nov 2026 00:00:00 GMT',
    }));

    const { result } = await run();

    expect(result.error).toBeUndefined();
    expect(result.output).toEqual({
      hosts: 3,
      pack_missing: false,
      feeds: [
        expect.objectContaining({
          release: 'ubuntu:noble',
          status: 'downloaded',
          hosts: 2,
          bytes: 10,
        }),
        expect.objectContaining({ release: 'rhel:9', status: 'downloaded', hosts: 1, bytes: 10 }),
      ],
    });
    expect(downloadMock).toHaveBeenCalledTimes(2);
    expect(getCachedFeed('ubuntu:noble', false)?.etag).toBe('"ubuntu"');
    expect(JSON.stringify(result.output)).not.toContain('records');
  });

  it('treats a 200 with identical bytes as unchanged, keeping the cache and the new etag', async () => {
    const body = new Uint8Array([1, 2, 3]);
    setCachedFeed('ubuntu:noble', {
      etag: '"old"',
      body,
      includeUnfixed: false,
      bodySha256: bodySha256(body),
    });
    inventoryMock.mockResolvedValue(snapshot([ubuntuHost]));
    downloadMock.mockResolvedValue({ status: 'ok', body, etag: '"new"' });

    const { result } = await run();

    expect(result.output?.feeds[0]).toMatchObject({
      release: 'ubuntu:noble',
      status: 'downloaded',
      unchanged: true,
      etag: '"new"',
    });
    // The cached body survives untouched and the new etag is retained for the next request.
    expect(getCachedFeed('ubuntu:noble', false)).toMatchObject({ etag: '"new"', body });
    expect(JSON.stringify(result.output)).not.toContain('records');
  });

  it('sends the cached etag and reuses the cached bytes on a 304', async () => {
    setCachedFeed('ubuntu:noble', {
      etag: '"old"',
      body: new Uint8Array(7),
      includeUnfixed: false,
    });
    inventoryMock.mockResolvedValue(snapshot([ubuntuHost]));
    downloadMock.mockResolvedValue({ status: 'not_modified', etag: '"old"' });

    const { result } = await run();

    expect(downloadMock).toHaveBeenCalledWith(ubuntuHost.inventory.os, {
      signal: expect.any(AbortSignal),
      etag: '"old"',
      includeUnfixed: false,
      logger: expect.objectContaining({ warn: expect.any(Function) }),
    });
    expect(result.output).toEqual(
      expect.objectContaining({
        feeds: [expect.objectContaining({ status: 'not_modified', bytes: 7, etag: '"old"' })],
      })
    );
  });

  it('records a failed download per release and still succeeds for the others', async () => {
    inventoryMock.mockResolvedValue(snapshot([ubuntuHost, rhelHost]));
    downloadMock.mockImplementation(async (os) => {
      if (os.family === 'ubuntu') throw new Error('Advisory feed returned HTTP 503');
      return { status: 'ok', body: new Uint8Array(4) };
    });

    const { result, deps } = await run();

    expect(result.error).toBeUndefined();
    expect(result.output).toEqual(
      expect.objectContaining({
        feeds: [
          expect.objectContaining({
            release: 'ubuntu:noble',
            status: 'failed',
            error: 'Advisory feed returned HTTP 503',
          }),
          expect.objectContaining({ release: 'rhel:9', status: 'downloaded' }),
        ],
      })
    );
    expect(deps.logger.warn).toHaveBeenCalledWith(expect.stringContaining('ubuntu:noble'));
    expect(getCachedFeed('ubuntu:noble', false)).toBeUndefined();
  });

  it('forwards downloadFeed degradation warnings to the run logger', async () => {
    inventoryMock.mockResolvedValue(snapshot([ubuntuHost]));
    downloadMock.mockImplementation(async (_os, options) => {
      options?.logger?.warn('CSAF delta over cap; using the archive alone.');
      return { status: 'ok', body: new Uint8Array(4) };
    });

    const { result, deps } = await run();

    expect(result.error).toBeUndefined();
    expect(deps.logger.warn).toHaveBeenCalledWith('CSAF delta over cap; using the archive alone.');
  });

  it('fails a 304 that has no cached feed behind it', async () => {
    inventoryMock.mockResolvedValue(snapshot([ubuntuHost]));
    downloadMock.mockResolvedValue({ status: 'not_modified' });

    const { result } = await run();

    expect(result.output).toEqual(
      expect.objectContaining({
        feeds: [
          expect.objectContaining({
            status: 'failed',
            error: 'The vendor answered 304 to a request without an ETag',
          }),
        ],
      })
    );
  });

  it('reports an unavailable release with its url', async () => {
    inventoryMock.mockResolvedValue(snapshot([rhelHost]));
    downloadMock.mockResolvedValue({ status: 'unavailable', url: 'https://example.invalid/rhel' });

    const { result } = await run();

    expect(result.output).toEqual(
      expect.objectContaining({
        feeds: [
          expect.objectContaining({ status: 'unavailable', url: 'https://example.invalid/rhel' }),
        ],
      })
    );
  });

  it('reports a missing pack without downloading anything', async () => {
    inventoryMock.mockResolvedValue(snapshot([], true));

    const { result } = await run();

    expect(result.output).toEqual({ feeds: [], hosts: 0, pack_missing: true });
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it('stops before the next release once aborted and returns what it has with an error', async () => {
    const controller = new AbortController();
    inventoryMock.mockResolvedValue(snapshot([ubuntuHost, rhelHost]));
    downloadMock.mockImplementation(async () => {
      controller.abort();
      return { status: 'ok', body: new Uint8Array(1) };
    });

    const { result } = await run(controller.signal);

    expect(downloadMock).toHaveBeenCalledTimes(1);
    expect(result.error?.message).toBe('The feed download was aborted');
    expect(result.output).toEqual(
      expect.objectContaining({ feeds: [expect.objectContaining({ release: 'ubuntu:noble' })] })
    );
  });

  it('reports an abort inside a download as aborted, not as a failed feed', async () => {
    const controller = new AbortController();
    inventoryMock.mockResolvedValue(snapshot([ubuntuHost]));
    downloadMock.mockImplementation(async () => {
      controller.abort();
      throw new Error('This operation was aborted');
    });

    const { result } = await run(controller.signal);

    expect(result.error?.message).toBe('The feed download was aborted');
    expect(result.output).toEqual(expect.objectContaining({ feeds: [] }));
  });

  it.each(['basic', 'gold', 'platinum'])(
    'refuses on a %s licence before reading anything',
    async (type) => {
      const { deps } = buildDeps({
        getLicense: async () => licenseMock.createLicense({ license: { type: type as never } }),
      });

      const result = await buildFetchFeedStepDefinition(deps).handler(buildContext({}));

      expect(result.error?.message).toBe(
        'Native vulnerability scanning requires an Enterprise licence'
      );
      expect(result.output).toBeUndefined();
      expect(deps.getScanDeps).not.toHaveBeenCalled();
      expect(inventoryMock).not.toHaveBeenCalled();
    }
  );

  it('runs on a trial licence', async () => {
    inventoryMock.mockResolvedValue(snapshot([], true));
    const { deps } = buildDeps({
      getLicense: async () =>
        licenseMock.createLicense({ license: { type: 'trial', mode: 'trial' } }),
    });

    const result = await buildFetchFeedStepDefinition(deps).handler(buildContext({}));

    expect(result.error).toBeUndefined();
    expect(result.output).toEqual({ feeds: [], hosts: 0, pack_missing: true });
  });
});
