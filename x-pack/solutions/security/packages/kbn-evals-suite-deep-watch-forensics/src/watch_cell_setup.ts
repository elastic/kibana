/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0. */
import type { ToolingLog } from '@kbn/tooling-log';
import type { EsClient } from '@kbn/scout';
import type { DeepWatchGoldenRow } from './golden_dataset';
import { ATTACK_DISCOVERY_INDEX } from './constants';

const EVENT_INDEX = 'logs-endpoint.events.process-default';

/**
 * Kill-chain events for the compromised host. Mirrors the Black Hat demo seeder
 * (scripts/endpoint/blackhat_demo): WKSTN-RECV01 -> SRV-DC01, 11 events.
 */
const KILL_CHAIN_EVENTS = [
  [0, 'WKSTN-RECV01', 'process', 'start', 'outlook.exe', 'phishing attachment opened'],
  [2, 'WKSTN-RECV01', 'process', 'start', 'winword.exe', 'malicious macro document'],
  [5, 'WKSTN-RECV01', 'process', 'start', 'powershell.exe', 'encoded command beacon'],
  [8, 'WKSTN-RECV01', 'network', 'connection', 'powershell.exe', 'C2 185.220.101.42:443'],
  [12, 'WKSTN-RECV01', 'file', 'creation', 'powershell.exe', 'dropper update.dll'],
  [15, 'WKSTN-RECV01', 'process', 'start', 'rundll32.exe', 'loader execution'],
  [20, 'WKSTN-RECV01', 'process', 'start', 'psexec.exe', 'lateral movement attempt'],
  [25, 'SRV-DC01', 'process', 'start', 'psexec.exe', 'remote service install'],
  [30, 'SRV-DC01', 'process', 'start', 'vssadmin.exe', 'shadow copy deletion'],
  [35, 'SRV-DC01', 'file', 'creation', 'vssadmin.exe', 'ntds.dit staging copy'],
  [42, 'SRV-DC01', 'network', 'connection', 'rundll32.exe', 'exfil to 185.220.101.42'],
] as const;

/**
 * Attack Discovery alert doc with FLAT dotted keys, not nested objects --
 * transformSearchResponseToAlerts reads hit._source['kibana.alert...'].
 * Shape proven live in the Forensics Watch E2E (seed script seed_ad2.py).
 */
const attackDiscoveryDoc = (row: DeepWatchGoldenRow) => ({
  '@timestamp': new Date().toISOString(),
  'kibana.alert.attack_discovery.alert_ids': ['seeded-alert-1'],
  // MUST be non-empty: the /api/attack_discovery/_find transformer silently drops docs
  // whose api_config is {} -- total counts them but data stays []. Found live 2026-09-03.
  'kibana.alert.attack_discovery.api_config': {
    action_type_id: '.gen-ai',
    connector_id: 'eval-seed-connector',
    name: 'eval-seed-connector',
  },
  'kibana.alert.attack_discovery.details_markdown': row.details,
  'kibana.alert.attack_discovery.summary_markdown': row.summary,
  'kibana.alert.attack_discovery.title': row.title,
  'kibana.alert.attack_discovery.mitre_attack_tactics': [
    'Initial Access',
    'Execution',
    'Lateral Movement',
    'Impact',
  ],
  'kibana.alert.attack_discovery.alerts_context_count': 11,
  'kibana.alert.rule.execution.uuid': crypto.randomUUID(),
  'kibana.alert.uuid': row.id,
  'kibana.alert.instance.id': row.id,
  'kibana.alert.start': new Date().toISOString(),
  'kibana.alert.last_detected': new Date().toISOString(),
  'kibana.alert.status': 'active',
  'kibana.alert.workflow_status': 'open',
  'kibana.alert.rule.category': 'Attack discovery',
  'kibana.alert.rule.consumer': 'siem',
  'kibana.alert.rule.name': 'Attack discovery (eval seed)',
  'kibana.alert.rule.producer': 'siem',
  'kibana.alert.rule.rule_type_id': 'attack-discovery',
  'kibana.alert.rule.uuid': crypto.randomUUID(),
  'kibana.alert.rule.revision': 0,
  'kibana.space_ids': ['default'],
  'kibana.alert.rule.parameters': {},
  'event.action': 'open',
  'event.kind': 'signal',
  'kibana.version': '9.6.0',
});

/**
 * Seed everything a clean eval cell needs for the gate-discrimination suite:
 * kill-chain events for the compromised host and one AD alert per golden row.
 * The quiet host (zero events) is the honest negative -- the contradiction row
 * reuses the compromised host deliberately.
 */
export const setupWatchCell = async ({
  esClient,
  log,
  rows,
}: {
  esClient: EsClient;
  log: ToolingLog;
  rows: DeepWatchGoldenRow[];
}): Promise<void> => {
  const now = Date.now();
  const ops: unknown[] = [];
  for (const [off, host, category, type, proc, text] of KILL_CHAIN_EVENTS) {
    ops.push({ create: { _index: EVENT_INDEX } });
    ops.push({
      '@timestamp': new Date(now - (42 - off) * 60_000).toISOString(),
      'event.dataset': 'endpoint forensics watch eval seed',
      'event.category': [category],
      'event.type': [type],
      'event.action': text,
      'process.name': proc,
      'host.name': host,
      'data_stream.dataset': 'endpoint.events.process',
    });
  }
  for (const row of rows) {
    ops.push({ index: { _index: ATTACK_DISCOVERY_INDEX, _id: row.id } });
    ops.push(attackDiscoveryDoc(row));
  }
  log.info(`Seeding ${KILL_CHAIN_EVENTS.length} kill-chain events + ${rows.length} AD alerts`);
  const bulkResp = (await esClient.bulk({ body: ops, refresh: 'wait_for' })) as {
    errors?: boolean;
    items?: Array<{ [op: string]: { error?: unknown } }>;
  };
  if (bulkResp.errors) {
    const failed = (bulkResp.items ?? [])
      .map((i) => Object.values(i)[0])
      .filter((r) => r && 'error' in (r as Record<string, unknown>));
    throw new Error(`Seed bulk had ${failed.length} item errors: ${JSON.stringify(failed.slice(0, 3))}`);
  }
  // `refresh: 'wait_for'` should make the docs searchable, but on a fast
  // single-model path we have seen count 0 at watch-run time (2026-09-04,
  // run dwv17c: derive_ids -> null, all rows "no data"). Poll counts until
  // the seeds are actually queryable so the watch never races the seed.
  const expectedEvents = KILL_CHAIN_EVENTS.length;
  const deadline = Date.now() + 30_000;
  for (;;) {
    const [events, ads] = await Promise.all([
      esClient.count({
        index: EVENT_INDEX,
        query: { term: { 'event.dataset': 'endpoint forensics watch eval seed' } },
      }) as Promise<{ count: number }>,
      esClient.count({
        index: ATTACK_DISCOVERY_INDEX,
        query: { ids: { values: rows.map((r) => r.id) } },
      }) as Promise<{ count: number }>,
    ]);
    if (events.count >= expectedEvents && ads.count >= rows.length) {
      log.info(
        `Seed queryable: ${events.count} events, ${ads.count} AD alerts (verified via _count before returning)`
      );
      return;
    }
    if (Date.now() > deadline) {
      throw new Error(
        `Seed not queryable after 30s: ${events.count}/${expectedEvents} events, ` +
          `${ads.count}/${rows.length} AD alerts -- aborting rather than running the watch against missing data`
      );
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
};

/** Remove everything this module indexed (idempotent). */
export const teardownWatchCell = async ({
  esClient,
  rows,
}: {
  esClient: EsClient;
  rows: DeepWatchGoldenRow[];
}): Promise<void> => {
  // One deleteByQuery covers all seeded events (tagged via event.dataset).
  // The previous per-event loop repeated the identical query 11 times.
  await esClient
    .deleteByQuery({
      index: EVENT_INDEX,
      refresh: true,
      query: { term: { 'event.dataset': 'endpoint forensics watch eval seed' } },
    })
    .catch(() => undefined);
  for (const row of rows) {
    await esClient.delete({ index: ATTACK_DISCOVERY_INDEX, id: row.id }).catch(() => undefined);
  }
};
