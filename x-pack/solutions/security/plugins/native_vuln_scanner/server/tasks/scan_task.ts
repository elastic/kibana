/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
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
import {
  emptyState,
  stateSchemaByVersion,
  truncate,
  type LatestTaskStateSchema,
} from './task_state';

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
  packMissing: boolean;
}

export type ScanRunStatus = 'success' | 'failed' | 'aborted' | 'no_pack';

/** Outcome of the latest run, kept in the task state so it can be read without the logs. */
export type ScanLastRun = NonNullable<LatestTaskStateSchema['lastRun']>;

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

const releaseKey = ({ family, version }: FeedOs): string => `${family}:${version}`;

const collect = async (rows: AsyncIterable<AgentInventoryRows>): Promise<AgentInventoryRows[]> => {
  const agents: AgentInventoryRows[] = [];
  for await (const agent of rows) agents.push(agent);
  return agents;
};

/**
 * Reads the latest inventory, then matches and writes one OS release at a time (a parsed feed
 * takes a few hundred MB of heap). A failed release does not stop the others; the run throws at
 * the end. Hosts of unmatched releases are left out of the write so their findings stay open.
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
    packMissing: false,
  };

  const scheduleIds = await findInventoryScheduleIds(packRepository);
  if (Object.keys(scheduleIds).length === 0) {
    summary.packMissing = true;
    logger.warn(
      'No "software-inventory" osquery pack found, so there is nothing to scan. Create the pack ' +
        'with its four inventory queries and assign it to an agent policy (see the ' +
        'native_vuln_scanner README); the next scan picks it up.'
    );
    return summary;
  }

  // Start-up creates the index too, but a write before it exists would auto-create it unmapped.
  await ensureFindingsIndex(es);
  const agents = await collect(readAgentInventories(es, { scheduleIds, signal }));
  const { hosts, skippedHosts, skippedRows } = normalizeInventories(agents);
  Object.assign(summary, { hosts: hosts.length, skippedHosts, skippedRows });
  if (hosts.length === 0) {
    logger.warn(
      'The "software-inventory" pack exists but no agent has reported inventory results yet. ' +
        'Check that the pack is assigned to an agent policy and that its queries have run ' +
        '(a pack with a long interval can take that long to report the first time).'
    );
  }

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
      stateSchemaByVersion,
      createTaskRunner: ({ signal, executionUuid }) => ({
        run: async () => {
          const deps = await getDeps();
          const now = deps.now ?? (() => new Date());
          try {
            const summary = await runScan(deps, { signal, runId: executionUuid });
            const status: ScanRunStatus = summary.packMissing
              ? 'no_pack'
              : summary.aborted
              ? 'aborted'
              : 'success';
            const { hosts, findings, releases } = summary;
            const lastRun: ScanLastRun = {
              runId: executionUuid,
              finishedAt: now().toISOString(),
              status,
              hosts,
              findings,
              releases,
            };
            return { state: { lastRun } };
          } catch (error) {
            // Returning the error (not throwing) lets Task Manager persist the state; a recurring
            // task is rescheduled on its interval either way. Marking it unrecoverable would
            // delete the task instead.
            const failed = error instanceof Error ? error : new Error(String(error));
            // A Task Manager timeout can land before the release loop (index setup, inventory
            // read); whatever that throws is the abort surfacing, not a scan failure.
            const aborted = signal.aborted;
            const failures =
              failed instanceof ScanFailedError
                ? Object.fromEntries(
                    Object.entries(failed.failures).map(([key, message]) => [
                      key,
                      truncate(message),
                    ])
                  )
                : undefined;
            const partial = failed instanceof ScanFailedError ? failed.summary : undefined;
            const lastRun: ScanLastRun = {
              runId: executionUuid,
              finishedAt: now().toISOString(),
              status: aborted ? 'aborted' : 'failed',
              hosts: partial?.hosts ?? 0,
              findings: partial?.findings ?? 0,
              releases: partial?.releases ?? {},
              ...(failures ? { failures } : {}),
              ...(aborted ? {} : { error: truncate(failed.message) }),
            };
            return aborted ? { state: { lastRun } } : { state: { lastRun }, error: failed };
          }
        },
      }),
    },
  });
};

const INTERVAL_UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

const intervalToMs = (interval: string): number | undefined => {
  const match = /^(\d+)([smhd])$/.exec(interval);
  return match ? Number(match[1]) * INTERVAL_UNIT_MS[match[2]] : undefined;
};

/** A scan is due when the task never finished one, or the last one is older than its interval. */
const isScanDue = (task: ConcreteTaskInstance, now: number): boolean => {
  const finishedAt = Date.parse(task.state?.lastRun?.finishedAt ?? '');
  const intervalMs = intervalToMs(task.schedule?.interval ?? DEFAULT_INTERVAL);
  if (Number.isNaN(finishedAt) || intervalMs === undefined) return true;
  return now - finishedAt >= intervalMs;
};

/**
 * Schedules the daily scan, keeping a schedule an operator has already changed. Resolves to true
 * when an existing task has not finished a scan within its interval; a new task runs on its own.
 */
export const scheduleScanTask = async (
  taskManager: TaskManagerStartContract,
  now: number = Date.now()
): Promise<boolean> => {
  const existing = await taskManager.get(SCAN_TASK_ID).catch((error: Error) => {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) return undefined;
    throw error;
  });
  await taskManager.ensureScheduled({
    id: SCAN_TASK_ID,
    taskType: SCAN_TASK_TYPE,
    schedule: existing?.schedule ?? { interval: DEFAULT_INTERVAL },
    params: {},
    state: emptyState,
  });
  return existing !== undefined && isScanDue(existing, now);
};
