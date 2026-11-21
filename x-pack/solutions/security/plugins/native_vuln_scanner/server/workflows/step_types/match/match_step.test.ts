/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { clearFeedCache, getCachedFeed, setCachedFeed } from '../../../lib/feeds/feed_cache';
import { loadFeed, parseFeedBody } from '../../../lib/feeds/fetch';
import { bodySha256 } from '../fetch_feed/fetch_feed_step';
import type { FeedOs } from '../../../lib/feeds/fetch';
import { NATIVE_VULN_SCANNER_REFRESH_WORKFLOW_ID } from '@kbn/workflows/managed';
import { ScanFailedError, runScan } from '../../../lib/scan';
import type { ScanDeps, ScanSummary } from '../../../lib/scan';
import { RUN_ID, buildContext, buildDeps } from '../test_helpers';
import { buildFeedLoader, buildMatchStepDefinition } from './match_step';

jest.mock('../../../lib/feeds/fetch', () => ({
  ...jest.requireActual('../../../lib/feeds/fetch'),
  loadFeed: jest.fn(),
  parseFeedBody: jest.fn(),
}));
jest.mock('../../../lib/scan', () => ({
  ...jest.requireActual('../../../lib/scan'),
  runScan: jest.fn(),
}));

const runScanMock = runScan as jest.MockedFunction<typeof runScan>;
const loadFeedMock = loadFeed as jest.MockedFunction<typeof loadFeed>;
const parseMock = parseFeedBody as jest.MockedFunction<typeof parseFeedBody>;

const noble: FeedOs = { family: 'ubuntu', version: 'noble' } as FeedOs;

const summary = (overrides: Partial<ScanSummary> = {}): ScanSummary => ({
  hosts: 3,
  skippedHosts: {},
  skippedRows: {},
  scope: 'full',
  releases: { 'ubuntu:noble': 'matched' },
  matchedReleases: 1,
  skippedReleases: 0,
  failedReleases: 0,
  unavailableReleases: 0,
  findings: 5,
  fixed: 1,
  fixSkipped: 0,
  matchStats: {},
  aborted: false,
  packMissing: false,
  kev: { status: 'ok', listed: 0 },
  distinctCves: 0,
  knowledge: { written: 0, unchanged: 0, failed: 0, skippedReleases: [] },
  feedInfo: {},
  ...overrides,
});

const runRefresh = async (input: unknown = {}, signal?: AbortSignal) => {
  const { deps } = buildDeps();
  const result = await buildMatchStepDefinition(deps).handler(
    buildContext(input, signal, '2026-11-13T00:00:00.000Z', NATIVE_VULN_SCANNER_REFRESH_WORKFLOW_ID)
  );
  const scanDeps = runScanMock.mock.calls[0]?.[0] as ScanDeps | undefined;
  return { result, scanDeps };
};

const run = async (input: unknown = {}, signal?: AbortSignal) => {
  const { deps } = buildDeps();
  const result = await buildMatchStepDefinition(deps).handler(buildContext(input, signal));
  const scanDeps = runScanMock.mock.calls[0]?.[0] as ScanDeps | undefined;
  return { result, scanDeps };
};

describe('native_vuln.match handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearFeedCache();
  });

  it('runs the scan under the execution id and maps the summary to the output', async () => {
    runScanMock.mockResolvedValue(summary());

    const { result } = await run();

    expect(runScanMock).toHaveBeenCalledWith(expect.anything(), {
      signal: expect.any(AbortSignal),
      runId: RUN_ID,
    });
    expect(result).toEqual({
      output: {
        hosts: 3,
        findings: 5,
        fixed: 1,
        aborted: false,
        pack_missing: false,
        releases: { 'ubuntu:noble': 'matched' },
        skipped_releases: 0,
        failures: {},
        kev: { status: 'ok', listed: 0 },
        knowledge: { written: 0, unchanged: 0, failed: 0, skipped_releases: [] },
        feed_provenance: {},
        distinct_cves: 0,
      },
    });
  });

  it('keeps the partial output and fails the step when a release failed to write', async () => {
    const partial = summary({ releases: { 'ubuntu:noble': 'failed', 'rhel:9': 'matched' } });
    runScanMock.mockRejectedValue(
      new ScanFailedError({ 'ubuntu:noble': 'bulk write rejected 3 documents' }, partial)
    );

    const { result } = await run();

    expect(result.error?.message).toContain('ubuntu:noble');
    expect(result.error?.message).toContain('bulk write rejected 3 documents');
    expect(result.output).toEqual(
      expect.objectContaining({
        findings: 5,
        releases: { 'ubuntu:noble': 'failed', 'rhel:9': 'matched' },
        failures: { 'ubuntu:noble': 'bulk write rejected 3 documents' },
      })
    );
  });

  it('fails the step without output when the failure carries no summary', async () => {
    runScanMock.mockRejectedValue(new ScanFailedError({ 'rhel:9': 'boom' }));

    const { result } = await run();

    expect(result.output).toBeUndefined();
    expect(result.error?.message).toContain('rhel:9');
  });

  it('rethrows an error that is not a scan failure', async () => {
    runScanMock.mockRejectedValue(new Error('inventory search failed'));

    await expect(run()).rejects.toThrow('inventory search failed');
  });

  it('returns the output with an error when the scan was aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    runScanMock.mockResolvedValue(summary({ aborted: true, releases: {} }));

    const { result } = await run({}, controller.signal);

    expect(result.error?.message).toBe(
      'The scan was aborted before every OS release was processed'
    );
    expect(result.output).toEqual(expect.objectContaining({ aborted: true }));
  });

  describe('feed loader', () => {
    const load = async (input: unknown) => {
      runScanMock.mockResolvedValue(summary());
      const { scanDeps } = await run(input);
      return scanDeps!.loadFeed!(noble, { signal: new AbortController().signal });
    };

    it('rethrows the error the fetch step reported for a failed release', async () => {
      await expect(
        load({ feeds: [{ release: 'ubuntu:noble', status: 'failed', error: 'HTTP 503' }] })
      ).rejects.toThrow('HTTP 503');
      expect(loadFeedMock).not.toHaveBeenCalled();
    });

    it('does not retry a release the fetch step found unavailable', async () => {
      const result = await load({
        feeds: [{ release: 'ubuntu:noble', status: 'unavailable', url: 'https://example.invalid' }],
      });

      expect(result).toEqual({ status: 'unavailable', url: 'https://example.invalid' });
      expect(loadFeedMock).not.toHaveBeenCalled();
    });

    it('parses the feed bytes the fetch step left on this node', async () => {
      const parsed = { records: [] } as never;
      parseMock.mockResolvedValue(parsed);
      setCachedFeed('ubuntu:noble', {
        etag: '"e"',
        lastModified: 'lm',
        body: new Uint8Array(2),
        includeUnfixed: false,
      });

      const result = await load({ feeds: [{ release: 'ubuntu:noble', status: 'downloaded' }] });

      expect(result).toEqual({
        status: 'ok',
        feed: parsed,
        etag: '"e"',
        lastModified: 'lm',
        bodySha256: bodySha256(new Uint8Array(2)),
        knowledgeStoredIds: undefined,
      });
      expect(loadFeedMock).not.toHaveBeenCalled();
    });

    describe('knowledge write after a 304', () => {
      const parsed = { records: [] } as never;
      const cacheFeed = (knowledgeStoredIds?: ReadonlySet<string>) => {
        parseMock.mockResolvedValue(parsed);
        setCachedFeed('ubuntu:noble', {
          etag: '"e"',
          body: new Uint8Array(2),
          includeUnfixed: false,
          knowledgeStoredIds,
        });
      };
      const loaded = (status: 'not_modified' | 'downloaded') =>
        load({ feeds: [{ release: 'ubuntu:noble', status, hosts: 1 }] });

      it('hands the loader the ids already stored for these bytes on a 304', async () => {
        const ids = new Set(['cve:ubuntu:noble:CVE-1']);
        cacheFeed(ids);
        expect((await loaded('not_modified')) as { knowledgeStoredIds?: unknown }).toMatchObject({
          knowledgeStoredIds: ids,
        });
      });

      it('hands over no ids when nothing was stored cleanly', async () => {
        cacheFeed(undefined);
        expect(await loaded('not_modified')).toMatchObject({ knowledgeStoredIds: undefined });
      });

      it('hands over the ids on an unchanged-200 too, which preserves them like a 304', async () => {
        const ids = new Set(['cve:ubuntu:noble:CVE-1']);
        cacheFeed(ids);
        expect((await loaded('downloaded')) as { knowledgeStoredIds?: unknown }).toMatchObject({
          knowledgeStoredIds: ids,
        });
      });

      it('records the ids of each clean write on the cached entry and clears them on a failure', async () => {
        runScanMock.mockResolvedValue(summary());
        cacheFeed();
        const { scanDeps } = await run({ feeds: [] });
        const ids = new Set(['cve:ubuntu:noble:CVE-1']);

        scanDeps!.onKnowledgeStored!(noble, ids);
        expect(getCachedFeed('ubuntu:noble', false)?.knowledgeStoredIds).toBe(ids);
        scanDeps!.onKnowledgeStored!(noble, undefined);
        expect(getCachedFeed('ubuntu:noble', false)?.knowledgeStoredIds).toBeUndefined();
      });
    });

    it('downloads the feed itself when this node has none cached', async () => {
      loadFeedMock.mockResolvedValue({ status: 'unavailable', url: 'https://example.invalid' });

      await load({ feeds: [{ release: 'ubuntu:noble', status: 'downloaded' }] });

      expect(loadFeedMock).toHaveBeenCalledWith(noble, {
        signal: expect.any(AbortSignal),
        includeUnfixed: false,
      });
    });
  });

  it.each(['basic', 'gold', 'platinum'])(
    'refuses on a %s licence before scanning',
    async (type) => {
      const { deps } = buildDeps({
        getLicense: async () => licenseMock.createLicense({ license: { type: type as never } }),
      });

      const result = await buildMatchStepDefinition(deps).handler(buildContext({}));

      expect(result.error?.message).toBe(
        'Native vulnerability scanning requires an Enterprise licence'
      );
      expect(runScanMock).not.toHaveBeenCalled();
      expect(deps.getScanDeps).not.toHaveBeenCalled();
    }
  );

  it('scans on a trial licence', async () => {
    runScanMock.mockResolvedValue(summary());
    const { deps } = buildDeps({
      getLicense: async () =>
        licenseMock.createLicense({ license: { type: 'trial', mode: 'trial' } }),
    });

    const result = await buildMatchStepDefinition(deps).handler(buildContext({}));

    expect(result.error).toBeUndefined();
    expect(runScanMock).toHaveBeenCalledTimes(1);
  });
});

describe('native_vuln.match refresh scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearFeedCache();
  });

  it('runs the scan with the refresh scope under the refresh workflow', async () => {
    runScanMock.mockResolvedValue(
      summary({
        scope: 'refresh',
        releases: { 'ubuntu:noble': 'skipped' },
        skippedReleases: 1,
        matchedReleases: 0,
      })
    );

    const { result, scanDeps } = await runRefresh();

    expect(scanDeps?.scope).toBe('refresh');
    expect(result.output).toMatchObject({
      scope: 'refresh',
      releases: { 'ubuntu:noble': 'skipped' },
      skipped_releases: 1,
    });
  });

  it('runs the scan with the full scope under any other workflow', async () => {
    runScanMock.mockResolvedValue(summary());
    const { result, scanDeps } = await run();
    expect(scanDeps?.scope).toBe('full');
    expect(result.output).not.toHaveProperty('scope');
  });
});

describe('buildFeedLoader against a real feed cache', () => {
  const body = new Uint8Array([1, 2, 3]);

  const loaderWithCache = async (knowledgeStoredIds?: ReadonlySet<string>) => {
    clearFeedCache();
    setCachedFeed('ubuntu:noble', { etag: '"e"', body, includeUnfixed: false, knowledgeStoredIds });
    parseMock.mockResolvedValue({ records: [] } as never);
    const loader = buildFeedLoader([{ release: 'ubuntu:noble', status: 'downloaded' }], false);
    return loader(noble, { signal: new AbortController().signal });
  };

  it('carries the cached body sha256 (backfilled by setCachedFeed), so the refresh skip works on a warm node', async () => {
    const result = (await loaderWithCache()) as { bodySha256?: string };
    expect(result.bodySha256).toBe(bodySha256(body));
  });

  it('carries the ids stored for exactly these bytes regardless of the fetch status', async () => {
    const ids = new Set(['cve:ubuntu:noble:CVE-1']);
    const result = (await loaderWithCache(ids)) as { knowledgeStoredIds?: ReadonlySet<string> };
    expect(result.knowledgeStoredIds).toBe(ids);
  });
});
