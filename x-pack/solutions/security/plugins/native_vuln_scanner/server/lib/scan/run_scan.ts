/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { createHash } from 'crypto';
import type { KevEntries, LoadKevResult } from '../enrichment/kev';
import { loadKev } from '../enrichment/kev';
import type { FeedOs, LoadFeedResult } from '../feeds/fetch';
import { feedUrl, loadFeed } from '../feeds/fetch';
import type { AgentInventoryRows, NormalizedHost } from '../inventory';
import { findInventoryScheduleIds, normalizeInventories, readAgentInventories } from '../inventory';
import type { Finding, MatchStats } from '../matcher';
import { buildAdvisoryIndex, matchHost } from '../matcher';
import { ensureFindingsIndex, writeFindings } from '../findings';
import type { CheckpointDoc, ScanRunScope } from '../checkpoint';
import { defaultReadCheckpoints, defaultWriteCheckpoint } from '../checkpoint';

export type { ScanRunScope };
import type { AdvisorySource, FeedParseResult } from '../feeds/types';
import {
  advisoryKnowledgeId,
  cveKnowledgeId,
  ensureKnowledgeIndex,
  writeKnowledge,
} from '../knowledge';
import type { KnowledgeWriteResult } from '../knowledge';
import { truncateText } from '../truncate';

export interface ScanDeps {
  es: ElasticsearchClient;
  packRepository: ISavedObjectsRepository;
  logger: Logger;
  loadFeed?: (os: FeedOs, options: { signal: AbortSignal }) => Promise<LoadFeedResult>;
  /** Loads the CISA KEV catalog; failure only skips enrichment. */
  loadKev?: (signal: AbortSignal) => Promise<LoadKevResult>;
  /** From kibana.yml: whether this run's feeds and findings include vendor-unfixed CVEs. */
  includeUnfixed?: boolean;
  /** Called after each release's knowledge write with every id now stored cleanly, or none after a failure. */
  onKnowledgeStored?: (os: FeedOs, storedIds?: ReadonlySet<string>) => void;
  /**
   * `refresh` (the hourly workflow): a release whose feed and inventory fingerprints both match
   * its checkpoint is skipped instead of matched. The default `full` scope matches every release.
   */
  scope?: ScanRunScope;
  /** Reads the release checkpoints a refresh decides against; defaults to reading ES. */
  readCheckpoints?: () => Promise<Map<string, CheckpointDoc>>;
  /** Writes one release's checkpoint after its findings were written; defaults to writing ES. */
  writeCheckpoint?: (doc: CheckpointDoc) => Promise<void>;
  now?: () => Date;
}

export interface ScanSummary {
  hosts: number;
  skippedHosts: Record<string, number>;
  skippedRows: Record<string, number>;
  /** `refresh` runs rematch only changed releases; `full` (the default) matches every release. */
  scope: ScanRunScope;
  /** Per OS release (`family:version`): matched, unavailable (no vendor feed), failed or skipped. */
  releases: Record<string, 'matched' | 'unavailable' | 'failed' | 'skipped'>;
  /** Run-level outcome counts over `releases`, so a refresh's skipping is visible at a glance. */
  matchedReleases: number;
  skippedReleases: number;
  failedReleases: number;
  unavailableReleases: number;
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
  /** Vendor-text docs written to the knowledge index; a failure there never fails the scan. */
  knowledge: KnowledgeWriteResult & {
    /** Releases whose write a 304 skipped because their text was already stored. */
    skippedReleases: string[];
  };
}

/** Bounds the skipped-release list; a deployment has a handful of OS releases. */
export const MAX_SKIPPED_RELEASES = 32;

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
export const truncate = (text: string, max: number = MAX_STATE_MESSAGE_LENGTH): string =>
  truncateText(text, max);

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

/**
 * Fingerprint of one release's per-host inventory, over exactly what the matcher reads: each
 * host's os, kernel release and (sorted, so package listing order cannot matter) packages.
 * Host identity (agent id, hostname) is deliberately excluded: a renamed host with the same
 * software must hash the same and stay skipped.
 */
export const inventoryFingerprint = (releaseHosts: readonly NormalizedHost[]): string => {
  const stable = releaseHosts.map(
    ({ inventory: { os, kernelRelease, enabledModules, packages } }) => [
      `${os.family}:${os.version}`,
      kernelRelease ?? null,
      enabledModules ? [...enabledModules].sort() : null,
      packages
        .map(({ name, version, arch, source }) => [name, version, arch ?? null, source ?? null])
        .sort((a, b) => a.join('\u0000').localeCompare(b.join('\u0000'))),
    ]
  );
  return createHash('sha256').update(JSON.stringify(stable)).digest('hex');
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

const sourceOf = ({ advisories, scheme }: Finding): AdvisorySource =>
  advisories[0]?.source ?? (scheme === 'dpkg' ? 'ubuntu' : 'redhat');

const knowledgeIdsOf = (findings: readonly Finding[], release: string): Set<string> => {
  const ids = new Set<string>();
  for (const finding of findings) {
    const source = sourceOf(finding);
    ids.add(cveKnowledgeId(source, release, finding.cve.id));
    for (const { id } of finding.advisories) ids.add(advisoryKnowledgeId(source, release, id));
  }
  return ids;
};

/**
 * Writes the vendor text of the CVEs and advisories this release's findings use. The text is
 * optional enrichment, so any failure is logged and counted, never thrown.
 */
const storeKnowledge = async (
  es: ElasticsearchClient,
  logger: Logger,
  feed: FeedParseResult,
  ids: ReadonlySet<string>,
  { now, signal }: { now: string; signal: AbortSignal }
): Promise<KnowledgeWriteResult> => {
  try {
    await ensureKnowledgeIndex(es);
    return await writeKnowledge(es, {
      ids,
      knowledge: feed.knowledge,
      source: feed.os.family === 'ubuntu' ? 'ubuntu' : 'redhat',
      os: feed.os,
      attribution: feed.attribution,
      snapshotTime: feed.snapshotTime,
      now,
      signal,
    });
  } catch (error) {
    logger.warn(
      `Could not write vendor advisory text to the knowledge index: ${
        error instanceof Error ? error.message : String(error)
      }. Findings are unaffected.`
    );
    // Only ids the feed has text for could have been written; the rest were never going to be.
    return {
      written: 0,
      unchanged: 0,
      failed: [...ids].filter((id) => feed.knowledge.has(id)).length,
    };
  }
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
    scope = 'full',
    readCheckpoints = defaultReadCheckpoints(es),
    writeCheckpoint = defaultWriteCheckpoint(es, logger),
    onKnowledgeStored,
    now = () => new Date(),
  }: ScanDeps,
  { signal, runId }: { signal: AbortSignal; runId: string }
): Promise<ScanSummary> => {
  const summary: ScanSummary = {
    hosts: 0,
    skippedHosts: {},
    skippedRows: {},
    scope,
    releases: {},
    matchedReleases: 0,
    skippedReleases: 0,
    failedReleases: 0,
    unavailableReleases: 0,
    findings: 0,
    fixed: 0,
    fixSkipped: 0,
    matchStats: {},
    aborted: false,
    packMissing: false,
    kev: { status: 'not_attempted', listed: 0 },
    distinctCves: 0,
    feedInfo: {},
    knowledge: { written: 0, unchanged: 0, failed: 0, skippedReleases: [] },
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
  // A refresh decides per release from the checkpoints of the last run that matched and wrote it;
  // a full scan needs none and matches everything.
  let checkpoints = new Map<string, CheckpointDoc>();
  if (scope === 'refresh') {
    try {
      checkpoints = await readCheckpoints();
    } catch (error) {
      // A transient read failure degrades to the no-checkpoint state (a full rematch),
      // never a failed run: refresh is an optimization over the scan's correctness.
      logger.warn(
        `Could not read the scan checkpoints; matching every release: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
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
        summary.unavailableReleases++;
        logger.warn(
          `No advisory feed for ${key} (${result.url}); skipped ${releaseHosts.length} hosts. ` +
            'This OS release is not supported by the native scanner, so its findings are not updated.'
        );
        continue;
      }
      // Only a refresh with a live checkpoint whose feed body and inventory both hash the same
      // skips: its findings were written by the checkpointed run and must stay open. A full scan
      // always matches. Skip decisions (and checkpoint comparisons) use the body sha256 only —
      // an unchanged-200 may rotate the vendor's etag, so an etag can never prove the bytes.
      const inventorySha256 = inventoryFingerprint(releaseHosts);
      const checkpoint = checkpoints.get(key);
      const feedUnchanged =
        result.bodySha256 !== undefined && checkpoint?.feed.sha256 === result.bodySha256;
      if (
        scope === 'refresh' &&
        checkpoint &&
        feedUnchanged &&
        checkpoint.inventory_sha256 === inventorySha256
      ) {
        summary.releases[key] = 'skipped';
        summary.skippedReleases++;
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
      // The feed text is only needed for what the findings use; dropping the rest frees it for the
      // (slow) Elasticsearch writes below.
      const usedKnowledge = knowledgeIdsOf(findings, os.version);
      for (const id of [...result.feed.knowledge.keys()]) {
        if (!usedKnowledge.has(id)) result.feed.knowledge.delete(id);
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
        knowledge: result.feed.knowledge,
        signal,
      });
      for (const { cve } of findings) cves.add(cve.id);
      // An unchanged feed (304) has the text of `knowledgeStoredIds` already stored (none after a
      // failed write), so only the ids this run uses beyond them are written.
      const alreadyStored = result.knowledgeStoredIds;
      const missing = alreadyStored
        ? new Set([...usedKnowledge].filter((id) => !alreadyStored.has(id)))
        : usedKnowledge;
      if (!alreadyStored || missing.size > 0) {
        const stored = await storeKnowledge(es, logger, result.feed, missing, {
          now: now().toISOString(),
          signal,
        });
        summary.knowledge.written += stored.written;
        summary.knowledge.unchanged += stored.unchanged;
        summary.knowledge.failed += stored.failed;
        onKnowledgeStored?.(
          os,
          stored.failed === 0 ? new Set([...(alreadyStored ?? []), ...usedKnowledge]) : undefined
        );
      } else if (summary.knowledge.skippedReleases.length < MAX_SKIPPED_RELEASES) {
        summary.knowledge.skippedReleases.push(key);
      }
      summary.distinctCves = cves.size;
      summary.releases[key] = 'matched';
      summary.matchedReleases++;
      // The checkpoint advances only once the findings write succeeded: a release that failed
      // keeps its previous checkpoint so the next refresh rematches it. Knowledge never gates it.
      if (result.bodySha256) {
        await writeCheckpoint({
          release: key,
          feed: { ...(result.etag ? { etag: result.etag } : {}), sha256: result.bodySha256 },
          inventory_sha256: inventorySha256,
          matched_at: now().toISOString(),
          run_id: runId,
          run_scope: scope,
        });
      }
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
      summary.failedReleases++;
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
