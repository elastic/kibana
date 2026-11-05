/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { PARITY_DOCS, type ParityDoc } from './chrysalis_parity_docs';

export const ALERT_INDEX = '.internal.alerts-security.alerts-default-000001';

/**
 * Seed profile:
 *  - `minimal` (default): the original 3-alert / single-rule fixture, byte-for-byte
 *    behavior preserved so scores stay comparable with the original published
 *    matrix runs.
 *  - `parity`: replays the original benchmark simulator dataset from
 *    chrysalis_parity_docs.ts, with timestamps shifted to seed time.
 *    Opt in with SEED_PROFILE=parity under a separate experiment label.
 */
export type SeedProfile = 'minimal' | 'parity';
function resolveSeedProfile(): SeedProfile {
  const raw = process.env.SEED_PROFILE;
  if (raw === undefined || raw === '') return 'minimal';
  if (raw === 'minimal' || raw === 'parity') return raw;
  throw new Error(
    `Unknown SEED_PROFILE '${raw}'. Valid profiles: 'minimal', 'parity'. ` +
      `The 'enriched' profile was removed because its scores were comparable with no seed at all.`
  );
}
export const seedProfile: SeedProfile = resolveSeedProfile();

interface AlertDoc {
  '@timestamp': string;
  'kibana.alert.rule.name': string;
  'kibana.alert.severity': string;
  'kibana.alert.risk_score': number;
  'kibana.alert.reason': string;
  'host.name': string;
  'user.name'?: string;
  'process.name'?: string;
  'file.hash.sha256'?: string;
  'event.category': string[];
  'event.type': string[];
  'kibana.alert.workflow_status': string;
  [key: string]: unknown;
}

const baseAlert: AlertDoc = {
  '@timestamp': new Date().toISOString(),
  'kibana.alert.rule.name': 'Suspicious BluetoothService Side-Load',
  'kibana.alert.severity': 'high',
  'kibana.alert.risk_score': 73,
  'kibana.alert.reason': 'suspicious dll load detected on Windows endpoint',
  'host.name': 'srv-win-defend-01',
  'user.name': 'SYSTEM',
  'process.name': 'BluetoothService.exe',
  'file.hash.sha256': '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
  'event.category': ['malware', 'process'],
  'event.type': ['start'],
  'kibana.alert.workflow_status': 'open',
};

const RESTAMP_KEYS = new Set([
  '@timestamp',
  'shift_start',
  'shift_end',
  'intended_timestamp',
  'original_time',
  'workflow_status_updated_at',
  'first_seen',
  'last_seen',
]);

function loadParityDocs(): { docs: ParityDoc[]; anchor: number } {
  const docs = PARITY_DOCS;
  const timestamps = docs
    .map((d) => Date.parse(d.doc['@timestamp'] as string))
    .filter((t) => !Number.isNaN(t));
  return { docs, anchor: Math.max(...timestamps) };
}

/** Re-stamp all timestamp-like fields relative to `now`, preserving deltas. */
function restamp(doc: Record<string, unknown>, offsetMs: number): Record<string, unknown> {
  const walk = (o: unknown): unknown => {
    if (Array.isArray(o)) return o.map(walk);
    if (o && typeof o === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
        if (RESTAMP_KEYS.has(k) && typeof v === 'string') {
          const t = Date.parse(v);
          out[k] = Number.isNaN(t) ? v : new Date(t + offsetMs).toISOString();
        } else {
          out[k] = walk(v);
        }
      }
      return out;
    }
    return o;
  };
  return walk(doc) as Record<string, unknown>;
}

export async function seedChrysalisAlerts({
  esClient,
  log,
  count = DEFAULT_SEED_COUNT,
}: {
  esClient: EsClient;
  log: ToolingLog;
  count?: number;
}): Promise<void> {
  assertValidCount(count);
  try {
    if (seedProfile === 'parity') {
      const { docs, anchor } = loadParityDocs();
      const offset = Date.now() - anchor;
      const byIndex = new Map<string, Array<Record<string, unknown>>>();
      for (const { index, doc } of docs) {
        const list = byIndex.get(index) ?? [];
        list.push(restamp(doc, offset));
        byIndex.set(index, list);
      }
      for (const [index, group] of byIndex) {
        await bulkCreateOrThrow(esClient, index, group, seedIdPrefix(index));
        log.info(`Seeded ${group.length} docs into ${index} (parity)`);
      }
      log.info(`Seeded ${docs.length} Chrysalis parity docs across ${byIndex.size} indices`);
      return;
    }

    const docs: AlertDoc[] = Array.from({ length: count }).map((_, i) => ({
      ...baseAlert,
      '@timestamp': new Date(Date.now() - i * 60000).toISOString(),
      'kibana.alert.risk_score': Math.max(30, 73 - i * 10),
    }));

    await bulkCreateOrThrow(esClient, ALERT_INDEX, docs, seedIdPrefix(ALERT_INDEX));
    log.info(
      `Seeded ${docs.length} Chrysalis alerts into ${ALERT_INDEX} (profile: ${seedProfile})`
    );
  } catch (err) {
    log.warning(`Failed to seed alerts: ${err}`);
    throw err;
  }
}

/**
 * `bulk` resolves even when individual items are rejected; item-level failures only surface in
 * `response.errors`. Throw so a partially seeded fixture fails setup instead of scoring on it.
 * When `idPrefix` is set, docs get deterministic ids so cleanup can remove exactly this run's docs.
 */
export async function bulkCreateOrThrow(
  esClient: EsClient,
  index: string,
  docs: Array<Record<string, unknown>>,
  idPrefix?: string
): Promise<void> {
  const response = await esClient.bulk({
    index,
    refresh: 'wait_for',
    operations: docs.flatMap((doc, i) => [
      { create: idPrefix ? { _id: `${idPrefix}-${i}` } : {} },
      doc,
    ]),
  });
  if (response.errors) {
    const failures = response.items
      .map((item) => item.create?.error)
      .filter((error) => error !== undefined)
      .map((error) => `${error?.type}: ${error?.reason}`);
    throw new Error(
      `Bulk seed into ${index} failed for ${failures.length}/${docs.length} docs: ${failures
        .slice(0, 3)
        .join('; ')}`
    );
  }
}

const SEED_DOC_ID_PREFIX = 'persona-matrix-seed';
const seedIdPrefix = (index: string) => `${SEED_DOC_ID_PREFIX}-${index}`;

/** Number of alerts `seedChrysalisAlerts` writes when `count` is omitted. */
export const DEFAULT_SEED_COUNT = 3;
const MAX_SEED_COUNT = 50;

function assertValidCount(count: number): void {
  if (!Number.isInteger(count) || count < 1 || count > MAX_SEED_COUNT) {
    throw new Error(
      `Invalid alert count ${count}. Must be an integer between 1 and ${MAX_SEED_COUNT}.`
    );
  }
}

export async function cleanupChrysalisAlerts({
  esClient,
  log,
  // Default to the max seedable count so a default cleanup removes everything
  // any seed call could have written, even when it was given a higher count.
  // delete_by_query on ids that were never written simply matches nothing.
  count: alertCount = MAX_SEED_COUNT,
}: {
  esClient: EsClient;
  log: ToolingLog;
  count?: number;
}): Promise<void> {
  assertValidCount(alertCount);
  try {
    // Delete exactly the docs this harness seeded, by their deterministic ids.
    // Never match_all here: the alerts index may hold foreign alerts on a shared cluster.
    await esClient.deleteByQuery({
      index: ALERT_INDEX,
      query: {
        ids: {
          values: Array.from({ length: alertCount }, (_, i) => `${seedIdPrefix(ALERT_INDEX)}-${i}`),
        },
      },
      refresh: true,
      conflicts: 'proceed',
      ignore_unavailable: true,
    });
    log.info(`Cleaned up alerts from ${ALERT_INDEX}`);
    if (seedProfile === 'parity') {
      const { docs } = loadParityDocs();
      const byIndex = new Map<string, number>();
      for (const { index } of docs) {
        byIndex.set(index, (byIndex.get(index) ?? 0) + 1);
      }
      for (const [index, count] of byIndex) {
        try {
          await esClient.deleteByQuery({
            index,
            query: {
              ids: {
                values: Array.from({ length: count }, (_, i) => `${seedIdPrefix(index)}-${i}`),
              },
            },
            refresh: true,
            conflicts: 'proceed',
            ignore_unavailable: true,
          });
          log.info(`Removed parity docs from ${index}`);
        } catch (err) {
          log.warning(`Cleanup warning for ${index}: ${err}`);
        }
      }
    }
  } catch (err) {
    log.warning(`Cleanup warning: ${err}`);
  }
}
