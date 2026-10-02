/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { PARITY_DOCS, type ParityDoc } from './chrysalis_parity_docs';

const ALERT_INDEX = '.internal.alerts-security.alerts-default-000001';

/**
 * Seed profile:
 *  - `minimal` (default): the original 3-alert / single-rule fixture, byte-for-byte
 *    behavior preserved so scores stay comparable with the original published
 *    matrix runs.
 *  - `parity`: replays the ORIGINAL benchmark simulator dataset
 *    (chrysalis-sim/chrysalis_simulator.py output, snapshot in
 *    chrysalis_parity_docs.jsonl) — 97 docs: 5-stage APT chain (5 needle +
 *    25 noise alerts), endpoint telemetry, threat intel, on-call schedule —
 *    with timestamps re-stamped relative to seed time. Opt in with
 *    SEED_PROFILE=parity; run under a separate experiment label.
 */
export type SeedProfile = 'minimal' | 'parity';
export const seedProfile: SeedProfile =
  process.env.SEED_PROFILE === 'parity' ? 'parity' : 'minimal';

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

const RESTAMP_KEYS = new Set(['@timestamp', 'shift_start', 'shift_end', 'intended_timestamp']);

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
  count = 3,
}: {
  esClient: EsClient;
  log: ToolingLog;
  count?: number;
}): Promise<void> {
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
        await esClient.bulk({
          index,
          refresh: 'wait_for',
          operations: group.flatMap((doc) => [{ create: {} }, doc]),
        });
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
    await esClient.bulk({
      index: ALERT_INDEX,
      refresh: 'wait_for',
      operations: docs.flatMap((doc) => [{ create: {} }, doc]),
    });
    log.info(`Seeded ${docs.length} Chrysalis alerts into ${ALERT_INDEX} (profile: minimal)`);
  } catch (err) {
    log.warning(`Failed to seed alerts: ${err}`);
    throw err;
  }
}

export async function cleanupChrysalisAlerts({
  esClient,
  log,
}: {
  esClient: EsClient;
  log: ToolingLog;
}): Promise<void> {
  try {
    await esClient.deleteByQuery({
      index: ALERT_INDEX,
      query: { match_all: {} },
      refresh: true,
      conflicts: 'proceed',
    });
    log.info(`Cleaned up alerts from ${ALERT_INDEX}`);
    if (seedProfile === 'parity') {
      const { docs } = loadParityDocs();
      const indices = [...new Set(docs.map((d) => d.index))];
      for (const index of indices) {
        try {
          if (index.startsWith('logs-')) {
            // logs-* names are data streams; index delete 404s on them
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (esClient as any).indices.deleteDataStream({ name: index });
          } else {
            await esClient.indices.delete({ index });
          }
          log.info(`Deleted parity index ${index}`);
        } catch (err) {
          log.warning(`Cleanup warning for ${index}: ${err}`);
        }
      }
    }
  } catch (err) {
    log.warning(`Cleanup warning: ${err}`);
  }
}
