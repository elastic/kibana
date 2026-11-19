/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';
import { parseRhelOval } from '../feeds/rhel_oval';
import type { KevEntries, LoadKevResult } from '../enrichment/kev';
import type { FeedOs, LoadFeedResult } from '../feeds/fetch';
import type { AgentInventoryRows } from '../inventory';
import { findInventoryScheduleIds, readAgentInventories } from '../inventory';
import { ensureFindingsIndex, writeFindings } from '../findings';
import type { ScanDeps } from './run_scan';
import { ScanFailedError, runScan, truncate } from './run_scan';

jest.mock('../inventory', () => ({
  ...jest.requireActual('../inventory'),
  findInventoryScheduleIds: jest.fn(),
  readAgentInventories: jest.fn(),
}));
jest.mock('../findings', () => ({
  ...jest.requireActual('../findings'),
  ensureFindingsIndex: jest.fn(),
  writeFindings: jest.fn(),
}));

const findIdsMock = findInventoryScheduleIds as jest.MockedFunction<
  typeof findInventoryScheduleIds
>;
const readMock = readAgentInventories as jest.MockedFunction<typeof readAgentInventories>;
const ensureMock = ensureFindingsIndex as jest.MockedFunction<typeof ensureFindingsIndex>;
const writeMock = writeFindings as jest.MockedFunction<typeof writeFindings>;

// Five definitions trimmed from rhel-9.oval.xml; giflib is fixed in 0:5.2.1-10.el9_8.1.
const rhelFixture = readFileSync(
  join(__dirname, '..', 'feeds', '__fixtures__', 'rhel_9_trimmed.oval.xml')
);

const rhelAgent = (agentId: string, major: string): AgentInventoryRows => ({
  agentId,
  hostName: `host-${agentId}`,
  os: { platform: 'rhel', major, platform_like: 'rhel', name: `Red Hat Enterprise Linux ${major}` },
  rpm: [
    {
      name: 'giflib',
      version: '5.2.1',
      release: '9.el9',
      arch: 'x86_64',
      source: 'giflib-5.2.1-9.el9.src.rpm',
    },
  ],
});

const ubuntuAgent = (agentId: string): AgentInventoryRows => ({
  agentId,
  os: { platform: 'ubuntu', codename: 'noble', major: '24.04', name: 'Ubuntu 24.04 LTS' },
  deb: [{ name: 'apt', version: '2.7.14build2', source: 'apt', status: 'install ok installed' }],
});

async function* rows(agents: AgentInventoryRows[]) {
  yield* agents;
}

const rhel9Feed = async (): Promise<LoadFeedResult> => ({
  status: 'ok',
  feed: await parseRhelOval([rhelFixture], { major: '9' }),
});

const KEV: KevEntries = new Map([
  [
    'CVE-2026-23868',
    { dateAdded: '2026-11-18', dueDate: '2026-12-02', knownRansomwareCampaignUse: 'Unknown' },
  ],
]);

const setup = (
  agents: AgentInventoryRows[],
  load: (os: FeedOs) => Promise<LoadFeedResult> = rhel9Feed,
  loadKev: () => Promise<LoadKevResult> = async () => ({ status: 'ok', entries: KEV })
) => {
  findIdsMock.mockResolvedValue({ rpm_packages: ['uuid-rpm'], os_version: ['uuid-os'] });
  readMock.mockImplementation(() => rows(agents));
  ensureMock.mockResolvedValue(undefined);
  writeMock.mockImplementation(async (_es, { findings, kev }) => ({
    written: findings.length,
    fixed: 1,
    fixSkipped: 0,
    kevListed: findings.filter(({ cve }) => kev?.has(cve.id)).length,
    failures: {},
  }));
  const loadFeed = jest.fn(load);
  const deps: ScanDeps = {
    es: elasticsearchServiceMock.createElasticsearchClient(),
    packRepository: savedObjectsRepositoryMock.create(),
    logger: loggingSystemMock.createLogger(),
    loadFeed,
    loadKev: jest.fn(loadKev),
    now: () => new Date('2026-11-13T00:00:00.000Z'),
  };
  return { deps, loadFeed };
};

const unavailable = (os: FeedOs): LoadFeedResult => ({
  status: 'unavailable',
  url: `https://example.invalid/${os.family}-${os.version}`,
});

describe('runScan', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does nothing when the inventory pack is not installed', async () => {
    const { deps, loadFeed } = setup([]);
    findIdsMock.mockResolvedValue({});
    const summary = await runScan(deps, { signal: new AbortController().signal, runId: 'r1' });
    expect(summary.hosts).toBe(0);
    expect(summary.packMissing).toBe(true);
    expect(deps.logger.warn).toHaveBeenCalledWith(expect.stringContaining('osquery pack found'));
    expect(readMock).not.toHaveBeenCalled();
    expect(ensureMock).not.toHaveBeenCalled();
    expect(loadFeed).not.toHaveBeenCalled();
    expect(writeMock).not.toHaveBeenCalled();
    expect(deps.loadKev).not.toHaveBeenCalled();
    expect(summary.kev).toEqual({ status: 'not_attempted', listed: 0 });
  });

  it('reads the inventory, matches each release against its feed and writes the findings', async () => {
    const { deps, loadFeed } = setup([rhelAgent('a1', '9'), rhelAgent('a2', '9')]);
    const { signal } = new AbortController();

    const summary = await runScan(deps, { signal, runId: 'r1' });

    expect(ensureMock).toHaveBeenCalledWith(deps.es);
    expect(readMock).toHaveBeenCalledWith(deps.es, {
      scheduleIds: { rpm_packages: ['uuid-rpm'], os_version: ['uuid-os'] },
      signal,
    });
    expect(loadFeed).toHaveBeenCalledTimes(1);
    expect(loadFeed).toHaveBeenCalledWith({ family: 'rhel', version: '9' }, { signal });
    expect(writeMock).toHaveBeenCalledTimes(1);
    const [, params] = writeMock.mock.calls[0];
    expect(params.hosts.map(({ id }) => id)).toEqual(['a1', 'a2']);
    expect(params.runId).toBe('r1');
    expect(params.now).toBe('2026-11-13T00:00:00.000Z');
    expect(params.signal).toBe(signal);
    expect(new Set(params.findings.map(({ hostId }) => hostId))).toEqual(new Set(['a1', 'a2']));
    expect(params.findings.every(({ package: pkg }) => pkg.name === 'giflib')).toBe(true);
    expect(summary).toEqual(
      expect.objectContaining({
        hosts: 2,
        releases: { 'rhel:9': 'matched' },
        findings: params.findings.length,
        fixed: 1,
        aborted: false,
      })
    );
    expect(summary.findings).toBeGreaterThan(0);
    expect(summary.distinctCves).toBe(new Set(params.findings.map(({ cve }) => cve.id)).size);
    const info = summary.feedInfo['rhel:9'];
    expect(info?.sourceUrl).toBe(
      'https://security.access.redhat.com/data/oval/v2/RHEL9/rhel-9.oval.xml.bz2'
    );
    expect(info?.snapshotTime).toBe('2026-11-12T19:21:30Z');
    // now() is 2026-11-13T00:00:00Z; the snapshot is from 2026-11-12T19:21:30Z.
    expect(info?.ageSeconds).toBe(16710);
  });

  it('hands the KEV catalog to the writer and counts the findings it lists', async () => {
    const { deps } = setup([rhelAgent('a1', '9'), rhelAgent('a2', '9')]);
    const { signal } = new AbortController();

    const summary = await runScan(deps, { signal, runId: 'r1' });

    expect(deps.loadKev).toHaveBeenCalledWith(signal);
    expect(writeMock.mock.calls[0][1].kev).toBe(KEV);
    expect(writeMock.mock.calls[0][1].keepKev).toBe(false);
    const listed = writeMock.mock.calls[0][1].findings.filter(
      ({ cve }) => cve.id === 'CVE-2026-23868'
    ).length;
    expect(listed).toBeGreaterThan(0);
    expect(summary.kev).toEqual({ status: 'ok', listed });
  });

  it('still scans and writes findings when the KEV catalog is unavailable', async () => {
    const { deps } = setup([rhelAgent('a1', '9')], rhel9Feed, async () => ({
      status: 'unavailable',
      reason: 'getaddrinfo ENOTFOUND www.cisa.gov',
    }));

    const summary = await runScan(deps, { signal: new AbortController().signal, runId: 'r1' });

    expect(summary.findings).toBeGreaterThan(0);
    expect(writeMock.mock.calls[0][1].kev).toBeUndefined();
    // No catalog at all: the writer keeps the stamps findings already have.
    expect(writeMock.mock.calls[0][1].keepKev).toBe(true);
    expect(summary.kev).toEqual({ status: 'unavailable', listed: 0 });
    expect(deps.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('CISA KEV catalog unavailable (getaddrinfo ENOTFOUND www.cisa.gov)')
    );
  });

  it('uses the stale catalog as the truth and does not keep old stamps', async () => {
    const { deps } = setup([rhelAgent('a1', '9')], rhel9Feed, async () => ({
      status: 'stale',
      entries: KEV,
      reason: 'HTTP 503',
    }));

    const summary = await runScan(deps, { signal: new AbortController().signal, runId: 'r1' });

    expect(writeMock.mock.calls[0][1].kev).toBe(KEV);
    expect(writeMock.mock.calls[0][1].keepKev).toBe(false);
    expect(summary.kev.status).toBe('stale');
    expect(summary.kev.listed).toBeGreaterThan(0);
    expect(deps.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('CISA KEV catalog refresh failed (HTTP 503)')
    );
  });

  it('reports not_attempted and downloads nothing when there are no hosts', async () => {
    const { deps } = setup([]);

    const summary = await runScan(deps, { signal: new AbortController().signal, runId: 'r1' });

    expect(deps.loadKev).not.toHaveBeenCalled();
    expect(summary.kev).toEqual({ status: 'not_attempted', listed: 0 });
  });

  it('treats a throwing KEV loader as unavailable', async () => {
    const { deps } = setup([rhelAgent('a1', '9')], rhel9Feed, async () => {
      throw new Error('boom');
    });

    const summary = await runScan(deps, { signal: new AbortController().signal, runId: 'r1' });

    expect(summary.findings).toBeGreaterThan(0);
    expect(summary.kev.status).toBe('unavailable');
  });

  it('warns when the pack exists but no agent has reported inventory', async () => {
    const { deps } = setup([]);
    await runScan(deps, { signal: new AbortController().signal, runId: 'r1' });
    expect(deps.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('no agent has reported inventory')
    );
  });

  it('skips a release with no vendor feed and leaves its hosts out of the write', async () => {
    const { deps } = setup([rhelAgent('a1', '9'), rhelAgent('a10', '10')], async (os) =>
      os.version === '10' ? unavailable(os) : rhel9Feed()
    );

    const summary = await runScan(deps, { signal: new AbortController().signal, runId: 'r1' });

    expect(summary.releases).toEqual({ 'rhel:9': 'matched', 'rhel:10': 'unavailable' });
    expect(deps.logger.warn).toHaveBeenCalledWith(expect.stringContaining('No advisory feed'));
    expect(writeMock).toHaveBeenCalledTimes(1);
    expect(writeMock.mock.calls[0][1].hosts.map(({ id }) => id)).toEqual(['a1']);
  });

  it('writes the other releases and then throws when one release fails', async () => {
    const { deps } = setup([ubuntuAgent('u1'), rhelAgent('a1', '9')], async (os) => {
      if (os.family === 'ubuntu') throw new Error('Advisory feed returned HTTP 503');
      return rhel9Feed();
    });

    const error = await runScan(deps, { signal: new AbortController().signal, runId: 'r1' }).catch(
      (e: Error) => e
    );

    expect(error).toBeInstanceOf(ScanFailedError);
    expect((error as ScanFailedError).failures).toEqual({
      'ubuntu:noble': 'Advisory feed returned HTTP 503',
    });
    expect(writeMock).toHaveBeenCalledTimes(1);
    expect(writeMock.mock.calls[0][1].hosts.map(({ id }) => id)).toEqual(['a1']);
  });

  it('stops before the next release once aborted', async () => {
    const controller = new AbortController();
    const { deps, loadFeed } = setup([rhelAgent('a1', '9'), ubuntuAgent('u1')], async (os) => {
      controller.abort();
      return unavailable(os);
    });

    const summary = await runScan(deps, { signal: controller.signal, runId: 'r1' });

    expect(loadFeed).toHaveBeenCalledTimes(1);
    expect(summary.aborted).toBe(true);
    expect(writeMock).not.toHaveBeenCalled();
  });

  it('reports an abort mid-release as aborted, not as a failed release', async () => {
    const controller = new AbortController();
    const { deps } = setup([rhelAgent('a1', '9')], async () => {
      controller.abort();
      throw new Error('This operation was aborted');
    });

    const summary = await runScan(deps, { signal: controller.signal, runId: 'r1' });

    expect(summary.aborted).toBe(true);
    expect(summary.releases).toEqual({});
  });
});

describe('truncate', () => {
  it('leaves text within the bound alone', () => {
    expect(truncate('abc', 3)).toBe('abc');
  });

  it('cuts at the bound', () => {
    expect(truncate('abcdef', 3)).toBe('abc');
  });

  it('does not split a surrogate pair at the cut', () => {
    // '😀' is two UTF-16 code units; a cut after the first would leave a lone surrogate.
    expect(truncate('ab😀cd', 3)).toBe('ab');
    expect(truncate('ab😀cd', 4)).toBe('ab😀');
  });
});
