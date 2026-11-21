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
import type { KnowledgeEntry } from '../feeds/types';
import type { AgentInventoryRows } from '../inventory';
import { findInventoryScheduleIds, normalizeInventories, readAgentInventories } from '../inventory';
import { ensureFindingsIndex, toFindingDoc, writeFindings } from '../findings';
import type { ScanDeps } from './run_scan';
import { ScanFailedError, inventoryFingerprint, runScan, truncate } from './run_scan';
import type { CheckpointDoc } from '../checkpoint';

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

  describe('knowledge index', () => {
    const KB = 'security_solution-native_knowledge.vulnerability_latest-1';
    const indexedIds = (deps: ScanDeps): string[] =>
      (deps.es.bulk as jest.Mock).mock.calls.flatMap(([{ operations }]) =>
        (operations as Array<{ index?: { _id: string } }>).flatMap(({ index }) =>
          index ? [index._id] : []
        )
      );
    const mockKb = (deps: ScanDeps) => {
      (deps.es.mget as jest.Mock).mockImplementation(async ({ ids }: { ids: string[] }) => ({
        docs: ids.map((_id) => ({ _id, found: false })),
      }));
      (deps.es.bulk as jest.Mock).mockResolvedValue({ errors: false, items: [], took: 1 });
    };

    // Every knowledge id the findings of the (single-release) rhel 9 run reference.
    const usedIds = (): Set<string> => {
      const used = new Set<string>();
      for (const finding of writeMock.mock.calls[0][1].findings) {
        used.add(`cve:redhat:9:${finding.cve.id}`);
        for (const { id } of finding.advisories) used.add(`adv:redhat:9:${id}`);
      }
      return used;
    };
    const run304 = async (knowledgeStoredIds?: ReadonlySet<string>) => {
      const { deps } = setup([rhelAgent('a1', '9')], async () => ({
        ...(await rhel9Feed()),
        knowledgeStoredIds,
      }));
      mockKb(deps);
      const summary = await runScan(deps, { signal: new AbortController().signal, runId: 'r1' });
      return { deps, summary };
    };

    it('creates the lookup index and writes the text of the advisories the findings use', async () => {
      const { deps } = setup([rhelAgent('a1', '9')]);
      mockKb(deps);

      const summary = await runScan(deps, { signal: new AbortController().signal, runId: 'r1' });

      expect(deps.es.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({ index: KB, settings: { index: { mode: 'lookup' } } })
      );
      const advisoryIds = writeMock.mock.calls[0][1].findings.flatMap((f) =>
        f.advisories.map(({ id }) => `adv:redhat:9:${id}`)
      );
      expect(indexedIds(deps)).toEqual(expect.arrayContaining(advisoryIds));
      expect(summary.knowledge).toEqual({
        written: indexedIds(deps).length,
        unchanged: 0,
        failed: 0,
        skippedReleases: [],
      });
      expect(summary.knowledge.written).toBeGreaterThan(0);
    });

    it('keeps one doc per release for a CVE both releases carry, and points each finding at its own', async () => {
      // The 9 feed re-keyed per release, each carrying its own text for the same CVE.
      const SHARED_CVE = 'CVE-2026-23868';
      const feedFor = async (version: '9' | '10'): Promise<LoadFeedResult> => {
        const { feed } = (await rhel9Feed()) as Extract<LoadFeedResult, { status: 'ok' }>;
        const knowledge = new Map<string, KnowledgeEntry>();
        for (const [id, entry] of feed.knowledge) {
          knowledge.set(id.replace(':redhat:9:', `:redhat:${version}:`), entry);
        }
        knowledge.set(`cve:redhat:${version}:${SHARED_CVE}`, {
          kind: 'cve',
          id: SHARED_CVE,
          description: `Release ${version} text`,
        });
        return {
          status: 'ok',
          feed: {
            ...feed,
            os: { ...feed.os, version },
            records: feed.records.map((record) => ({
              ...record,
              os: { ...record.os, version },
            })),
            knowledge,
          },
        };
      };
      const load = async (os: FeedOs) => feedFor(os.version === '10' ? '10' : '9');
      const agents = [rhelAgent('a1', '9'), rhelAgent('a10', '10')];

      // A tiny in-memory knowledge index, so the second run sees what the first one stored.
      const store = new Map<string, { content_hash?: string; last_seen_in_feed?: string }>();
      const run = async () => {
        const { deps } = setup(agents, load);
        (deps.es.mget as jest.Mock).mockImplementation(async ({ ids }: { ids: string[] }) => ({
          docs: ids.map((_id) =>
            store.has(_id) ? { _id, found: true, _source: store.get(_id) } : { _id, found: false }
          ),
        }));
        (deps.es.bulk as jest.Mock).mockImplementation(
          async ({ operations }: { operations: Array<Record<string, unknown>> }) => {
            for (let i = 0; i < operations.length; i += 2) {
              const { index } = operations[i] as { index?: { _id: string } };
              if (index) store.set(index._id, operations[i + 1] as { content_hash?: string });
            }
            return { errors: false, items: [], took: 1 };
          }
        );
        const summary = await runScan(deps, { signal: new AbortController().signal, runId: 'r' });
        return { summary, calls: writeMock.mock.calls.map(([, params]) => params) };
      };

      const first = await run();
      const docIds = [...store.keys()];
      const sharedCve = SHARED_CVE;
      expect(docIds).toEqual(
        expect.arrayContaining([`cve:redhat:9:${sharedCve}`, `cve:redhat:10:${sharedCve}`])
      );
      expect(first.summary.knowledge.written).toBe(docIds.length);
      expect(
        (store.get(`cve:redhat:9:${sharedCve}`) as { content_hash: string }).content_hash
      ).not.toBe(
        (store.get(`cve:redhat:10:${sharedCve}`) as { content_hash: string }).content_hash
      );

      // Each finding's knowledge_id is the doc of its own release.
      let sharedSeen = 0;
      for (const { hosts, findings, knowledge } of first.calls) {
        const [host] = hosts;
        const release = host.os.version;
        for (const finding of findings) {
          const doc = toFindingDoc(finding, host, {
            now: '2026-11-13T00:00:00.000Z',
            runId: 'r',
            knowledge,
          });
          expect(doc.native_vuln_scanner.knowledge_id).toBe(
            `cve:redhat:${release}:${finding.cve.id}`
          );
          if (finding.cve.id === sharedCve) {
            sharedSeen += 1;
            expect(store.has(doc.native_vuln_scanner.knowledge_id)).toBe(true);
          }
        }
      }

      expect(sharedSeen).toBe(2);

      writeMock.mockClear();
      const second = await run();
      expect([...store.keys()]).toEqual(docIds);
      expect(second.summary.knowledge).toEqual({
        written: 0,
        unchanged: docIds.length,
        failed: 0,
        skippedReleases: [],
      });
    });

    it('skips the knowledge write on a 304 when every used id is already stored', async () => {
      const first = await run304();
      const stored = usedIds();
      expect(indexedIds(first.deps).length).toBeGreaterThan(0);

      writeMock.mockClear();
      const { deps, summary } = await run304(stored);

      expect(summary.findings).toBeGreaterThan(0);
      expect(deps.es.mget).not.toHaveBeenCalled();
      expect(deps.es.bulk).not.toHaveBeenCalled();
      expect(summary.knowledge).toEqual({
        written: 0,
        unchanged: 0,
        failed: 0,
        skippedReleases: ['rhel:9'],
      });
    });

    it('writes only the used ids a 304 has not stored yet, and does not list the release as skipped', async () => {
      const first = await run304();
      const all = indexedIds(first.deps);
      const stored = usedIds();
      stored.delete(all[0]);

      writeMock.mockClear();
      const { deps, summary } = await run304(stored);

      expect(indexedIds(deps)).toEqual([all[0]]);
      expect(summary.knowledge).toEqual({
        written: 1,
        unchanged: 0,
        failed: 0,
        skippedReleases: [],
      });
    });

    it('rewrites every used id on a 304 after a failed write left no stored ids', async () => {
      const first = await run304();
      const all = indexedIds(first.deps);

      writeMock.mockClear();
      const { deps, summary } = await run304(undefined);

      expect(indexedIds(deps).sort()).toEqual([...all].sort());
      expect(summary.knowledge.skippedReleases).toEqual([]);
    });

    it('reports each release write to onKnowledgeStored, clean or not', async () => {
      const onKnowledgeStored = jest.fn();
      const clean = setup([rhelAgent('a1', '9')]);
      clean.deps.onKnowledgeStored = onKnowledgeStored;
      mockKb(clean.deps);
      await runScan(clean.deps, { signal: new AbortController().signal, runId: 'r1' });
      expect(onKnowledgeStored).toHaveBeenLastCalledWith(
        { family: 'rhel', version: '9' },
        usedIds()
      );

      const failing = setup([rhelAgent('a1', '9')]);
      failing.deps.onKnowledgeStored = onKnowledgeStored;
      (failing.deps.es.mget as jest.Mock).mockImplementation(
        async ({ ids }: { ids: string[] }) => ({
          docs: ids.map((_id) => ({ _id, found: false })),
        })
      );
      (failing.deps.es.bulk as jest.Mock).mockResolvedValue({
        errors: true,
        items: [{ index: { error: { type: 'x' } } }],
        took: 1,
      });
      await runScan(failing.deps, { signal: new AbortController().signal, runId: 'r2' });
      expect(onKnowledgeStored).toHaveBeenLastCalledWith(
        { family: 'rhel', version: '9' },
        undefined
      );
    });

    it('does not call onKnowledgeStored for a 304 whose text is already stored', async () => {
      const onKnowledgeStored = jest.fn();
      const first = await run304();
      expect(indexedIds(first.deps).length).toBeGreaterThan(0);
      const stored = usedIds();
      writeMock.mockClear();
      const { deps } = setup([rhelAgent('a1', '9')], async () => ({
        ...(await rhel9Feed()),
        knowledgeStoredIds: stored,
      }));
      deps.onKnowledgeStored = onKnowledgeStored;
      await runScan(deps, { signal: new AbortController().signal, runId: 'r1' });
      expect(onKnowledgeStored).not.toHaveBeenCalled();
    });

    it('reports the stored ids plus the newly written ones after a partial 304 write', async () => {
      const onKnowledgeStored = jest.fn();
      const first = await run304();
      const stored = usedIds();
      stored.delete(indexedIds(first.deps)[0]);
      const before = new Set(stored);
      writeMock.mockClear();
      const { deps } = setup([rhelAgent('a1', '9')], async () => ({
        ...(await rhel9Feed()),
        knowledgeStoredIds: stored,
      }));
      mockKb(deps);
      deps.onKnowledgeStored = onKnowledgeStored;
      await runScan(deps, { signal: new AbortController().signal, runId: 'r1' });
      expect(before.size).toBeLessThan(usedIds().size);
      expect(onKnowledgeStored).toHaveBeenCalledWith({ family: 'rhel', version: '9' }, usedIds());
    });

    it('lists a release whose write was skipped on a 304 with a clean prior write', async () => {
      await run304();
      const stored9 = usedIds();
      writeMock.mockClear();
      const { deps } = setup([rhelAgent('a1', '9'), rhelAgent('a10', '10')], async (os) => {
        const loaded = await rhel9Feed();
        return os.version === '9' ? { ...loaded, knowledgeStoredIds: stored9 } : loaded;
      });
      const summary = await runScan(deps, { signal: new AbortController().signal, runId: 'r1' });
      expect(summary.knowledge.skippedReleases).toEqual(['rhel:9']);
    });

    it('lists no skipped release when every write ran', async () => {
      const { deps } = setup([rhelAgent('a1', '9')]);
      const summary = await runScan(deps, { signal: new AbortController().signal, runId: 'r1' });
      expect(summary.knowledge.skippedReleases).toEqual([]);
    });

    it('counts a thrown write as failed only for ids the feed has text for', async () => {
      const { deps } = setup([rhelAgent('a1', '9')]);
      (deps.es.indices.create as jest.Mock).mockRejectedValue(new Error('security_exception'));

      const summary = await runScan(deps, { signal: new AbortController().signal, runId: 'r1' });

      const { feed } = (await rhel9Feed()) as Extract<LoadFeedResult, { status: 'ok' }>;
      const { findings } = writeMock.mock.calls[0][1];
      const wanted = new Set<string>();
      for (const finding of findings) {
        wanted.add(`cve:redhat:9:${finding.cve.id}`);
        for (const { id } of finding.advisories) wanted.add(`adv:redhat:9:${id}`);
      }
      const withText = [...wanted].filter((id) => feed.knowledge.has(id)).length;
      expect(wanted.size).toBeGreaterThan(withText);
      expect(summary.knowledge.failed).toBe(withText);
    });

    it('keeps the findings and the release status when the knowledge write fails', async () => {
      const { deps } = setup([rhelAgent('a1', '9')]);
      (deps.es.indices.create as jest.Mock).mockRejectedValue(new Error('security_exception'));

      const summary = await runScan(deps, { signal: new AbortController().signal, runId: 'r1' });

      expect(summary.releases).toEqual({ 'rhel:9': 'matched' });
      expect(summary.findings).toBeGreaterThan(0);
      expect(summary.knowledge.written).toBe(0);
      expect(summary.knowledge.failed).toBeGreaterThan(0);
      expect(deps.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Findings are unaffected')
      );
    });
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

describe('runScan refresh scope', () => {
  const signal = new AbortController().signal;
  const fingerprintOf = (agents: AgentInventoryRows[]): string =>
    inventoryFingerprint(normalizeInventories(agents).hosts);

  const checkpointed = async (
    agents: AgentInventoryRows[],
    load: (os: FeedOs) => Promise<LoadFeedResult>,
    feedSha: string,
    inventorySha: string
  ) => {
    const { deps, loadFeed } = setup(agents, load);
    const checkpoints = new Map<string, CheckpointDoc>([
      [
        'rhel:9',
        {
          release: 'rhel:9',
          feed: { etag: '"e"', sha256: feedSha },
          inventory_sha256: inventorySha,
          matched_at: '2026-11-13T00:00:00.000Z',
          run_id: 'r0',
          run_scope: 'refresh',
        },
      ],
    ]);
    const writeCheckpoint = jest.fn();
    const depsRefresh: ScanDeps = {
      ...deps,
      scope: 'refresh',
      readCheckpoints: async () => checkpoints,
      writeCheckpoint,
    };
    return { depsRefresh, loadFeed, writeCheckpoint };
  };

  it('skips a release whose feed body and inventory both match the checkpoint, without writing findings', async () => {
    const agents = [rhelAgent('a1', '9')];
    const load = async (): Promise<LoadFeedResult> => ({
      status: 'ok',
      feed: await parseRhelOval([rhelFixture], { major: '9' }),
      bodySha256: 'feed-sha',
    });
    const { depsRefresh, writeCheckpoint } = await checkpointed(
      agents,
      load,
      'feed-sha',
      fingerprintOf(agents)
    );
    const summary = await runScan(depsRefresh, { signal, runId: 'r1' });
    expect(summary.releases['rhel:9']).toBe('skipped');
    expect(summary.skippedReleases).toBe(1);
    expect(summary.matchedReleases).toBe(0);
    expect(writeMock).not.toHaveBeenCalled();
    // Skipping never rewrites the checkpoint.
    expect(writeCheckpoint).not.toHaveBeenCalled();
  });

  it('rematches a release whose feed body changed', async () => {
    const agents = [rhelAgent('a1', '9')];
    const load = async (): Promise<LoadFeedResult> => ({
      status: 'ok',
      feed: await parseRhelOval([rhelFixture], { major: '9' }),
      bodySha256: 'new-feed-sha',
    });
    const { depsRefresh, writeCheckpoint } = await checkpointed(
      agents,
      load,
      'old-feed-sha',
      fingerprintOf(agents)
    );
    const summary = await runScan(depsRefresh, { signal, runId: 'r1' });
    expect(summary.releases['rhel:9']).toBe('matched');
    expect(writeMock).toHaveBeenCalled();
    expect(writeCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        release: 'rhel:9',
        feed: { etag: undefined, sha256: 'new-feed-sha' },
        run_scope: 'refresh',
        run_id: 'r1',
      })
    );
  });

  it('rematches a release whose inventory changed', async () => {
    const agents = [rhelAgent('a1', '9')];
    const load = async (): Promise<LoadFeedResult> => ({
      status: 'ok',
      feed: await parseRhelOval([rhelFixture], { major: '9' }),
      bodySha256: 'feed-sha',
    });
    const { depsRefresh } = await checkpointed(agents, load, 'feed-sha', 'stale-inventory-sha');
    const summary = await runScan(depsRefresh, { signal, runId: 'r1' });
    expect(summary.releases['rhel:9']).toBe('matched');
    expect(writeMock).toHaveBeenCalled();
  });

  it('rematches everything when there is no checkpoint, and writes one', async () => {
    const agents = [rhelAgent('a1', '9')];
    const load = async (): Promise<LoadFeedResult> => ({
      status: 'ok',
      feed: await parseRhelOval([rhelFixture], { major: '9' }),
      bodySha256: 'feed-sha',
    });
    const { deps } = setup(agents, load);
    const writeCheckpoint = jest.fn();
    const summary = await runScan(
      { ...deps, scope: 'refresh', readCheckpoints: async () => new Map(), writeCheckpoint },
      { signal, runId: 'r1' }
    );
    expect(summary.releases['rhel:9']).toBe('matched');
    expect(writeCheckpoint).toHaveBeenCalledTimes(1);
    expect(writeCheckpoint.mock.calls[0][0].inventory_sha256).toBe(fingerprintOf(agents));
  });

  it('matches every release on the full scope even with an unchanged checkpoint present', async () => {
    const agents = [rhelAgent('a1', '9')];
    const load = async (): Promise<LoadFeedResult> => ({
      status: 'ok',
      feed: await parseRhelOval([rhelFixture], { major: '9' }),
      bodySha256: 'feed-sha',
    });
    const { deps } = setup(agents, load);
    const readCheckpoints = jest.fn();
    const summary = await runScan({ ...deps, readCheckpoints }, { signal, runId: 'r1' });
    expect(summary.scope).toBe('full');
    expect(summary.releases['rhel:9']).toBe('matched');
    expect(writeMock).toHaveBeenCalled();
    // A full scan never reads the checkpoints: its match set is not skippable.
    expect(readCheckpoints).not.toHaveBeenCalled();
  });

  it('does not advance the checkpoint when the findings write fails', async () => {
    const agents = [rhelAgent('a1', '9')];
    const load = async (): Promise<LoadFeedResult> => ({
      status: 'ok',
      feed: await parseRhelOval([rhelFixture], { major: '9' }),
      bodySha256: 'new-feed-sha',
    });
    writeMock.mockRejectedValueOnce(new Error('es write failed'));
    const { depsRefresh, writeCheckpoint } = await checkpointed(
      agents,
      load,
      'old-feed-sha',
      fingerprintOf(agents)
    );
    await expect(runScan(depsRefresh, { signal, runId: 'r1' })).rejects.toThrow(ScanFailedError);
    expect(writeCheckpoint).not.toHaveBeenCalled();
  });
});

describe('inventoryFingerprint ordering', () => {
  const packages = [
    { name: 'openssl', version: '3.0.7', arch: 'x86_64', source: 'openssl-3.0.7.src.rpm' },
    { name: 'openssl', version: '3.0.7', arch: 'i686', source: 'openssl-3.0.7.src.rpm' },
    { name: 'zlib', version: '1.2.11', arch: 'x86_64', source: 'zlib-1.2.11.src.rpm' },
  ];
  const hostOf = (rpm: typeof packages) => ({
    agentId: 'a1',
    hostName: 'h',
    os: { platform: 'rhel', major: '9', platform_like: 'rhel', name: 'RHEL 9' },
    rpm,
  });

  it('is independent of the osquery iteration order of same-name entries', () => {
    const direct = inventoryFingerprint(normalizeInventories([hostOf(packages)]).hosts);
    const shuffled = inventoryFingerprint(
      normalizeInventories([hostOf([packages[1], packages[2], packages[0]])]).hosts
    );
    expect(shuffled).toBe(direct);
  });
});

describe('refresh checkpoint-read resilience', () => {
  const signal = new AbortController().signal;

  it('matches every release when the checkpoint read fails, without failing the run', async () => {
    const agents = [rhelAgent('a1', '9')];
    const load = async (): Promise<LoadFeedResult> => ({
      status: 'ok',
      feed: await parseRhelOval([rhelFixture], { major: '9' }),
      bodySha256: 'feed-sha',
    });
    const { deps } = setup(agents, load);
    const summary = await runScan(
      {
        ...deps,
        scope: 'refresh',
        readCheckpoints: async () => {
          throw new Error('es read timeout');
        },
      },
      { signal, runId: 'r1' }
    );
    expect(summary.releases['rhel:9']).toBe('matched');
    expect(writeMock).toHaveBeenCalled();
  });
});
