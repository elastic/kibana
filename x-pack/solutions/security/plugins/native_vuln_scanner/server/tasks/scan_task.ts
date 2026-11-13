/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, ISavedObjectsRepository, Logger } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskCost, TaskPriority } from '@kbn/task-manager-plugin/server';
import type { FeedOs, LoadFeedResult } from '../lib/feeds/fetch';
import { loadFeed } from '../lib/feeds/fetch';
import type { AgentInventoryRows, NormalizedHost } from '../lib/inventory';
import {
  findInventoryScheduleIds,
  normalizeInventories,
  readAgentInventories,
} from '../lib/inventory';
import type { Finding, MatchStats } from '../lib/matcher';
import { buildAdvisoryIndex, matchHost } from '../lib/matcher';
import { ensureFindingsIndex, writeFindings } from '../lib/findings';

export const SCAN_TASK_TYPE = 'native-vuln-scanner:scan';
export const SCAN_TASK_ID = 'native-vuln-scanner:scan';
const DEFAULT_INTERVAL = '1d';

export interface ScanDeps {
  es: ElasticsearchClient;
  packRepository: ISavedObjectsRepository;
  logger: Logger;
  loadFeed?: (os: FeedOs, options: { signal: AbortSignal }) => Promise<LoadFeedResult>;
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
}

export class ScanFailedError extends Error {
  constructor(public readonly failures: Record<string, string>) {
    super(
      `Vulnerability scan failed for ${Object.keys(failures).join(', ')}: ${JSON.stringify(
        failures
      )}`
    );
    this.name = 'ScanFailedError';
  }
}

const releaseKey = ({ family, version }: FeedOs): string => `${family}:${version}`;

const collect = async (rows: AsyncIterable<AgentInventoryRows>): Promise<AgentInventoryRows[]> => {
  const agents: AgentInventoryRows[] = [];
  for await (const agent of rows) agents.push(agent);
  return agents;
};

/**
 * One scan: read the latest osquery inventory, then for each OS release in turn download its
 * advisory feed, match that release's hosts and write their findings. Releases are processed one
 * at a time because a parsed feed index takes a few hundred MB of heap.
 *
 * A failure on one release does not stop the others; the run throws at the end so Task Manager
 * records it. Hosts of a release that was not matched are left out of the write, so their open
 * findings are not marked fixed.
 */
export const runScan = async (
  { es, packRepository, logger, loadFeed: load = loadFeed, now = () => new Date() }: ScanDeps,
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
  };

  const scheduleIds = await findInventoryScheduleIds(packRepository);
  if (Object.keys(scheduleIds).length === 0) {
    logger.info('No "software-inventory" osquery pack found; nothing to scan');
    return summary;
  }

  // Start-up creates the index too, but a write before it exists would auto-create it unmapped.
  await ensureFindingsIndex(es);
  const agents = await collect(readAgentInventories(es, { scheduleIds, signal }));
  const { hosts, skippedHosts, skippedRows } = normalizeInventories(agents);
  Object.assign(summary, { hosts: hosts.length, skippedHosts, skippedRows });

  const byRelease = new Map<string, NormalizedHost[]>();
  for (const host of hosts) {
    const key = releaseKey(host.inventory.os);
    const list = byRelease.get(key);
    if (list) list.push(host);
    else byRelease.set(key, [host]);
  }

  const failures: Record<string, string> = {};
  for (const [key, releaseHosts] of byRelease) {
    if (signal.aborted) {
      summary.aborted = true;
      break;
    }
    const os = releaseHosts[0].inventory.os;
    try {
      const result = await load(os, { signal });
      if (result.status === 'unavailable') {
        summary.releases[key] = 'unavailable';
        logger.info(
          `No advisory feed for ${key} (${result.url}); skipped ${releaseHosts.length} hosts`
        );
        continue;
      }
      const findings: Finding[] = [];
      {
        // Scoped so the index can be collected before the next release is loaded.
        const index = buildAdvisoryIndex(result.feed.records);
        for (const { inventory } of releaseHosts) {
          findings.push(...matchHost(inventory, index, summary.matchStats));
        }
      }
      const written = await writeFindings(es, {
        hosts: releaseHosts.map(({ meta }) => meta),
        findings,
        now: now().toISOString(),
        runId,
        signal,
      });
      summary.releases[key] = 'matched';
      summary.findings += written.written;
      summary.fixed += written.fixed;
      summary.fixSkipped += written.fixSkipped;
    } catch (error) {
      if (signal.aborted) {
        summary.aborted = true;
        break;
      }
      summary.releases[key] = 'failed';
      failures[key] = error instanceof Error ? error.message : String(error);
      logger.warn(`Vulnerability scan of ${key} failed: ${failures[key]}`);
    }
  }

  logger.info(`Vulnerability scan ${runId}: ${JSON.stringify(summary)}`);
  if (Object.keys(failures).length > 0) throw new ScanFailedError(failures);
  return summary;
};

export const registerScanTask = (
  taskManager: TaskManagerSetupContract,
  getDeps: () => Promise<ScanDeps>
): void => {
  taskManager.registerTaskDefinitions({
    [SCAN_TASK_TYPE]: {
      title: 'Native vulnerability scanner: match osquery inventory against vendor advisories',
      // Downloads and parses vendor feeds; noble alone takes ~10 s and ~300 MB.
      timeout: '30m',
      cost: TaskCost.ExtraLarge,
      priority: TaskPriority.Deferrable,
      createTaskRunner: ({ signal, executionUuid }) => ({
        run: async () => {
          // A recurring task is rescheduled on its interval whatever the error, so errors are
          // thrown as-is. Marking one unrecoverable would delete the task instead.
          await runScan(await getDeps(), { signal, runId: executionUuid });
          return { state: {} };
        },
      }),
    },
  });
};

/** Schedules the daily scan, keeping a schedule an operator has already changed. */
export const scheduleScanTask = async (taskManager: TaskManagerStartContract): Promise<void> => {
  const existing = await taskManager.get(SCAN_TASK_ID).catch(() => undefined);
  await taskManager.ensureScheduled({
    id: SCAN_TASK_ID,
    taskType: SCAN_TASK_TYPE,
    schedule: existing?.schedule ?? { interval: DEFAULT_INTERVAL },
    params: {},
    state: {},
  });
};
