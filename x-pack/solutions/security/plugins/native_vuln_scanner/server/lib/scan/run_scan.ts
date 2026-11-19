/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, ISavedObjectsRepository, Logger } from '@kbn/core/server';
import type { KevEntries, LoadKevResult } from '../enrichment/kev';
import { loadKev } from '../enrichment/kev';
import type { FeedOs, LoadFeedResult } from '../feeds/fetch';
import { feedUrl, loadFeed } from '../feeds/fetch';
import type { AgentInventoryRows, NormalizedHost } from '../inventory';
import { findInventoryScheduleIds, normalizeInventories, readAgentInventories } from '../inventory';
import type { Finding, MatchStats } from '../matcher';
import { buildAdvisoryIndex, matchHost } from '../matcher';
import { ensureFindingsIndex, writeFindings } from '../findings';

export interface ScanDeps {
  es: ElasticsearchClient;
  packRepository: ISavedObjectsRepository;
  logger: Logger;
  loadFeed?: (os: FeedOs, options: { signal: AbortSignal }) => Promise<LoadFeedResult>;
  /** Loads the CISA KEV catalog; failure only skips enrichment. */
  loadKev?: (signal: AbortSignal) => Promise<LoadKevResult>;
  /** From kibana.yml: whether this run's feeds and findings include vendor-unfixed CVEs. */
  includeUnfixed?: boolean;
  now?: () => Date;
}

export interface ScanSummary {
  hosts: number;
  skippedHosts: Record<string, number>;
  skippedRows: Record<string, number>;
  /** Per OS release (`family:version`): matched, unavailable (no vendor feed) or failed. */
  releases: Record<string, 'matched' | 'unavailable' | 'failed'>;
  findings: number;
  fixed: number;
  fixSkipped: number;
  matchStats: MatchStats;
  aborted: boolean;
  packMissing: boolean;
  /**
   * How findings were checked against CISA KEV and how many were stamped this run: `ok` is a
   * current catalog, `stale` an expired copy served because the refresh failed, `unavailable` no
   * catalog (existing stamps are kept), `not_attempted` no download was tried.
   */
  kev: { status: 'ok' | 'stale' | 'unavailable' | 'not_attempted'; listed: number };
  /** Distinct CVE ids among this run's matched findings (a multi-host CVE counts once). */
  distinctCves: number;
  /** Feed provenance the run actually used, keyed like `releases`. */
  feedInfo: Record<string, { sourceUrl?: string; snapshotTime?: string; ageSeconds?: number }>;
}

export class ScanFailedError extends Error {
  /** `summary` keeps what the other releases did, so the failed run can still report it. */
  constructor(
    public readonly failures: Record<string, string>,
    public readonly summary?: ScanSummary
  ) {
    super(
      `Vulnerability scan failed for ${Object.keys(failures).join(', ')}: ${JSON.stringify(
        failures
      )}`
    );
    this.name = 'ScanFailedError';
  }
}

export const MAX_STATE_MESSAGE_LENGTH = 2048;

/** Cuts text to the summary bound without splitting a surrogate pair. */
export const truncate = (text: string, max: number = MAX_STATE_MESSAGE_LENGTH): string => {
  if (text.length <= max) return text;
  const lastCode = text.charCodeAt(max - 1);
  const isHighSurrogate = lastCode >= 0xd800 && lastCode <= 0xdbff;
  return text.slice(0, isHighSurrogate ? max - 1 : max);
};

export const releaseKey = ({ family, version }: FeedOs): string => `${family}:${version}`;

export const groupByRelease = (hosts: NormalizedHost[]): Map<string, NormalizedHost[]> => {
  const byRelease = new Map<string, NormalizedHost[]>();
  for (const host of hosts) {
    const key = releaseKey(host.inventory.os);
    const list = byRelease.get(key);
    if (list) list.push(host);
    else byRelease.set(key, [host]);
  }
  return byRelease;
};

const collect = async (rows: AsyncIterable<AgentInventoryRows>): Promise<AgentInventoryRows[]> => {
  const agents: AgentInventoryRows[] = [];
  for await (const agent of rows) agents.push(agent);
  return agents;
};

export interface InventorySnapshot {
  hosts: NormalizedHost[];
  skippedHosts: Record<string, number>;
  skippedRows: Record<string, number>;
  packMissing: boolean;
}

/** Reads and normalizes the latest inventory; shared by the scan and the feed step that lists the releases to fetch. */
export const readInventory = async (
  { es, packRepository, logger }: Pick<ScanDeps, 'es' | 'packRepository' | 'logger'>,
  signal: AbortSignal
): Promise<InventorySnapshot> => {
  const scheduleIds = await findInventoryScheduleIds(packRepository);
  if (Object.keys(scheduleIds).length === 0) {
    logger.warn(
      'No "software-inventory" osquery pack found, so there is nothing to scan. Create the pack ' +
        'with its four inventory queries and assign it to an agent policy (see the ' +
        'native_vuln_scanner README); the next scan picks it up.'
    );
    return { hosts: [], skippedHosts: {}, skippedRows: {}, packMissing: true };
  }

  // Start-up creates the index too, but a write before it exists would auto-create it unmapped.
  await ensureFindingsIndex(es);
  const agents = await collect(readAgentInventories(es, { scheduleIds, signal }));
  const { hosts, skippedHosts, skippedRows } = normalizeInventories(agents);
  if (hosts.length === 0) {
    logger.warn(
      'The "software-inventory" pack exists but no agent has reported inventory results yet. ' +
        'Check that the pack is assigned to an agent policy and that its queries have run ' +
        '(a pack with a long interval can take that long to report the first time).'
    );
  }
  return { hosts, skippedHosts, skippedRows, packMissing: false };
};

interface KevCatalog {
  status: 'ok' | 'stale' | 'unavailable';
  entries?: KevEntries;
}

/** The KEV catalog for this run; a failed load warns once and leaves the run unenriched. */
const loadKevEntries = async (
  load: (signal: AbortSignal) => Promise<LoadKevResult>,
  signal: AbortSignal,
  logger: Logger
): Promise<KevCatalog> => {
  const catalog = await load(signal).catch(
    (error): LoadKevResult => ({
      status: 'unavailable',
      reason: error instanceof Error ? error.message : String(error),
    })
  );
  if (catalog.status === 'ok') return { status: 'ok', entries: catalog.entries };
  if (catalog.status === 'stale') {
    logger.warn(
      `CISA KEV catalog refresh failed (${catalog.reason}); this run uses the last downloaded ` +
        'copy. The next scan retries.'
    );
    return { status: 'stale', entries: catalog.entries };
  }
  logger.warn(
    `CISA KEV catalog unavailable (${catalog.reason}); findings of this run keep the known ` +
      'exploited marks they already have. The next scan retries.'
  );
  return { status: 'unavailable' };
};

/**
 * Reads the latest inventory, then matches and writes one OS release at a time (a parsed feed
 * takes a few hundred MB of heap). A failed release does not stop the others; the run throws at
 * the end. Hosts of unmatched releases are left out of the write so their findings stay open.
 */
export const runScan = async (
  {
    es,
    packRepository,
    logger,
    loadFeed: load = loadFeed,
    loadKev: loadKevCatalog = (abort) => loadKev(abort, { logger }),
    includeUnfixed,
    now = () => new Date(),
  }: ScanDeps,
  { signal, runId }: { signal: AbortSignal; runId: string }
): Promise<ScanSummary> => {
  const summary: ScanSummary = {
    hosts: 0,
    skippedHosts: {},
    skippedRows: {},
    releases: {},
    findings: 0,
    fixed: 0,
    fixSkipped: 0,
    matchStats: {},
    aborted: false,
    packMissing: false,
    kev: { status: 'not_attempted', listed: 0 },
    distinctCves: 0,
    feedInfo: {},
  };

  const inventory = await readInventory({ es, packRepository, logger }, signal);
  if (inventory.packMissing) {
    summary.packMissing = true;
    return summary;
  }
  const { hosts, skippedHosts, skippedRows } = inventory;
  Object.assign(summary, { hosts: hosts.length, skippedHosts, skippedRows });

  const byRelease = groupByRelease(hosts);

  // Enrichment is optional: a failed load leaves findings unenriched but never fails the scan.
  // With no hosts there is nothing to stamp, so the catalog is not downloaded.
  let kev: KevCatalog | undefined;
  if (byRelease.size > 0) {
    kev = await loadKevEntries(loadKevCatalog, signal, logger);
    summary.kev.status = kev.status;
  }

  const failures: Record<string, string> = {};
  const cves = new Set<string>();
  const scanStart = now();
  for (const [key, releaseHosts] of byRelease) {
    if (signal.aborted) {
      summary.aborted = true;
      break;
    }
    const os = releaseHosts[0].inventory.os;
    try {
      const result = await load(os, { signal });
      summary.feedInfo[key] = {
        sourceUrl: feedUrl(os, { includeUnfixed }),
        ...(result.status === 'ok' && result.feed.snapshotTime
          ? {
              snapshotTime: result.feed.snapshotTime,
              ageSeconds: Math.max(
                0,
                Math.floor(
                  (scanStart.getTime() - new Date(result.feed.snapshotTime).getTime()) / 1000
                )
              ),
            }
          : {}),
      };
      if (result.status === 'unavailable') {
        summary.releases[key] = 'unavailable';
        logger.warn(
          `No advisory feed for ${key} (${result.url}); skipped ${releaseHosts.length} hosts. ` +
            'This OS release is not supported by the native scanner, so its findings are not updated.'
        );
        continue;
      }
      const findings: Finding[] = [];
      {
        // Scoped so the index can be collected before the next release is loaded.
        const index = buildAdvisoryIndex(result.feed.records);
        for (const { inventory: hostInventory } of releaseHosts) {
          findings.push(...matchHost(hostInventory, index, summary.matchStats));
        }
      }
      const written = await writeFindings(es, {
        hosts: releaseHosts.map(({ meta }) => meta),
        findings,
        now: now().toISOString(),
        runId,
        unfixedScanned: includeUnfixed ?? false,
        kev: kev?.entries,
        // Only an outage keeps the stamps already stored; an ok or stale catalog is the truth.
        keepKev: kev?.status === 'unavailable',
        signal,
      });
      for (const { cve } of findings) cves.add(cve.id);
      summary.distinctCves = cves.size;
      summary.releases[key] = 'matched';
      summary.findings += written.written;
      summary.fixed += written.fixed;
      summary.fixSkipped += written.fixSkipped;
      summary.kev.listed += written.kevListed;
    } catch (error) {
      if (signal.aborted) {
        summary.aborted = true;
        break;
      }
      summary.releases[key] = 'failed';
      failures[key] = error instanceof Error ? error.message : String(error);
      logger.warn(
        `Vulnerability scan of ${key} failed: ${failures[key]}. If this is a feed download error, ` +
          'check that Kibana can reach the vendor advisory host; the scan is retried on its next run.'
      );
    }
  }

  logger.info(`Vulnerability scan ${runId}: ${JSON.stringify(summary)}`);
  if (Object.keys(failures).length > 0) throw new ScanFailedError(failures, summary);
  return summary;
};
