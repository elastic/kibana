/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
 * Elastic License 2.0. Licensed under the Elastic License 2.0"; you may not use
 * this file except in compliance with, at your election, the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", or the "Server Side
 * Public License v 1".
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * Environment-truth seeds for the persona matrix.
 *
 * Every category prompt must be satisfiable by data/tools that actually exist
 * in the eval stack. Before this module, four categories measured "model gives
 * up gracefully on a missing backend" instead of the capability under test:
 *
 * - Threat Hunting hunts `log.dll` across process/file telemetry → we seed
 *   `logs-endpoint.events.process-default` with the side-load evidence.
 * - Multi-Step checks the Chrysalis hash against Elastic Security Labs → we
 *   seed the Labs knowledge index with a T1574.002 entry for that hash.
 * - Triggering Workflows checks the hash against VirusTotal → VirusTotal is
 *   NOT shipped with the stack; we seed a mock threat-intel verdict index and
 *   (in persona_matrix_tools_seed) point the `virustotal_lookup` tool at it.
 * - Entity Analytics profiles srv-win-defend-01 → we seed a watchlist and an
 *   entity-store record so watchlist/entity lookups return data.
 *
 * All seeds are idempotent (skip when the marker doc already exists) and
 * cleaned up by `cleanupEnvSeeds`.
 */

export const ENV_SEED_MARKER_INDEX = 'persona-matrix-env-seeds';
const ENDPOINT_INDEX = 'logs-endpoint.events.process-default';
const LABS_INDEX = 'logs-security_labs.research-default';
const TI_INDEX = 'ti-mock-default';
const WATCHLIST_SO_TYPE = 'security-tanker-watchlist';
const ENTITY_INDEX = '.entities-v1';
const ONCALL_INDEX = 'on-call-schedule';

const CHRYSALIS_HASH = '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f';
const HOST = 'srv-win-defend-01';

interface SeedOptions {
  esClient: EsClient;
  kbnClient: KbnClient;
  log: ToolingLog;
}

async function ensureIndexWithDocs(
  esClient: EsClient,
  index: string,
  docs: Array<Record<string, unknown>>,
  log: ToolingLog,
  markerId: string
): Promise<void> {
  const marker = await esClient.exists({ index, id: markerId }).catch(() => ({ body: false }));
  // exists() throws on missing index; treat that as "not seeded"
  if (marker && (marker as { body?: boolean }).body === true) {
    log.info(`[env-seed] ${index} already seeded, skipping`);
    return;
  }
  await esClient.indices.create({ index }).catch((err) => {
    // 400 resource_already_exists is fine (concurrent boot)
    const status =
      (err as { statusCode?: number })?.statusCode ??
      (err as { meta?: { statusCode?: number } })?.meta?.statusCode;
    if (status !== 400) throw err;
  });
  await esClient.bulk({
    index,
    refresh: 'wait_for',
    operations: [
      ...docs.flatMap((doc) => [{ create: {} }, doc] as const),
      // marker doc so idempotent reruns skip
      { create: { _id: markerId } },
      { seeded: true, seeded_at: new Date().toISOString() },
    ],
  });
  log.info(`[env-seed] seeded ${docs.length} docs into ${index}`);
}

export async function seedPersonaMatrixEnvironment({
  esClient,
  kbnClient,
  log,
}: SeedOptions): Promise<void> {
  const markerId = 'persona-matrix-env-seed-v1';

  // A2: endpoint process telemetry with the log.dll side-load evidence.
  await ensureIndexWithDocs(
    esClient,
    ENDPOINT_INDEX,
    [
      {
        '@timestamp': '2026-07-21T07:58:11.320Z',
        'event.category': ['process'],
        'event.type': ['start'],
        'event.dataset': 'endpoint.events.process',
        'host.name': HOST,
        'user.name': 'SYSTEM',
        'process.name': 'BluetoothService.exe',
        'process.executable': 'C:\\Windows\\BluetoothService.exe',
        'process.parent.name': 'services.exe',
        'process.command_line': 'C:\\Windows\\BluetoothService.exe -embed',
      },
      {
        '@timestamp': '2026-07-21T07:58:11.900Z',
        'event.category': ['file'],
        'event.type': ['creation'],
        'event.dataset': 'endpoint.events.file',
        'host.name': HOST,
        'user.name': 'SYSTEM',
        'process.name': 'BluetoothService.exe',
        'file.name': 'log.dll',
        'file.path': 'C:\\Users\\Public\\log.dll',
        'file.hash.sha256': CHRYSALIS_HASH,
        'file.code_signature.status': 'unsigned',
      },
      {
        '@timestamp': '2026-07-21T07:58:12.100Z',
        'event.category': ['dll'],
        'event.type': ['start'],
        'event.action': 'dll_loaded',
        'event.dataset': 'endpoint.events.library',
        'host.name': HOST,
        'process.name': 'BluetoothService.exe',
        'dll.name': 'log.dll',
        'dll.path': 'C:\\Users\\Public\\log.dll',
        'process.executable': 'C:\\Windows\\BluetoothService.exe',
      },
    ],
    log,
    markerId
  );

  // A3: Elastic Security Labs research entry so security_labs_search returns content.
  await ensureIndexWithDocs(
    esClient,
    LABS_INDEX,
    [
      {
        '@timestamp': '2026-07-14T00:00:00.000Z',
        title: 'Chrysalis backdoor: DLL side-loading via BluetoothService.exe',
        'security_labs.id': 'SL-2026-0142',
        'security_labs.tags': ['malware', 'chrysalis', 'dll-side-loading'],
        'security_labs.threat_technique_id': 'T1574.002',
        'security_labs.ioc.hash.sha256': [CHRYSALIS_HASH],
        'security_labs.ioc.file.name': ['log.dll'],
        'security_labs.ioc.process.name': ['BluetoothService.exe'],
        content:
          `Elastic Security Labs tracks the Chrysalis backdoor as side-loading log.dll ` +
          `(sha256 ${CHRYSALIS_HASH}) from a world-writable path via the legitimate BluetoothService.exe binary. ` +
          `The hash is a known-bad indicator: flagged by 45/72 vendors on VirusTotal at ` +
          `time of research. Recommended detection: DLL load from C:\\Users\\Public by a ` +
          `service binary (T1574.002).`,
      },
    ],
    log,
    markerId
  );

  // A1: mock VirusTotal verdict so the stubbed virustotal_lookup tool returns a
  // coherent answer. VirusTotal itself is NOT part of the stack — this index is
  // the eval-only stub the tool queries.
  await ensureIndexWithDocs(
    esClient,
    TI_INDEX,
    [
      {
        '@timestamp': '2026-07-20T00:00:00.000Z',
        'threat_intel.provider': 'virustotal-mock',
        'threat_intel.indicator.type': 'hash.sha256',
        'threat_intel.indicator.value': CHRYSALIS_HASH,
        'threat_intel.verdict': 'malicious',
        'threat_intel.detection_ratio': '45/72',
        'threat_intel.classification': 'trojan/chrysalis',
        'threat_intel.first_seen': '2026-07-02T00:00:00.000Z',
      },
    ],
    log,
    markerId
  );

  // A4: entity-store record + watchlist so entity lookups return data.
  await ensureIndexWithDocs(
    esClient,
    ENTITY_INDEX,
    [
      {
        '@timestamp': '2026-07-21T08:00:00.000Z',
        'entity.type': 'host',
        'entity.id': `host-default-${HOST}`,
        'entity.name': HOST,
        'entity.display_name': HOST,
        'entity.risk_score': 73,
        'entity.risk_level': 'high',
        'entity.criticality': 'high',
        'entity.tags': ['windows', 'endpoint'],
      },
      // A4a: ranked set + the SYSTEM user so entity-analytics-b ("rank the
      // riskiest entities, profile the top one") and -c ("SYSTEM user's
      // history/risk") have real data. A single host could not be ranked and no
      // user entity existed for the watchlist to attach to.
      {
        '@timestamp': '2026-07-21T08:00:00.000Z',
        'entity.type': 'host',
        'entity.id': 'host-default-srv-linux-web-02',
        'entity.name': 'srv-linux-web-02',
        'entity.display_name': 'srv-linux-web-02',
        'entity.risk_score': 41,
        'entity.risk_level': 'moderate',
        'entity.criticality': 'medium',
        'entity.tags': ['linux', 'web'],
      },
      {
        '@timestamp': '2026-07-21T08:00:00.000Z',
        'entity.type': 'host',
        'entity.id': 'host-default-srv-mac-dev-03',
        'entity.name': 'srv-mac-dev-03',
        'entity.display_name': 'srv-mac-dev-03',
        'entity.risk_score': 18,
        'entity.risk_level': 'low',
        'entity.criticality': 'low',
        'entity.tags': ['macos', 'dev'],
      },
      {
        '@timestamp': '2026-07-21T08:05:00.000Z',
        'entity.type': 'user',
        'entity.id': `user-default-SYSTEM-${HOST}`,
        'entity.name': 'SYSTEM',
        'entity.display_name': `SYSTEM (${HOST})`,
        'entity.risk_score': 88,
        'entity.risk_level': 'critical',
        'entity.criticality': 'high',
        'entity.tags': ['privileged', 'service-account'],
        'entity.last_seen': '2026-07-21T08:00:00.000Z',
        'entity.history':
          'SYSTEM on srv-win-defend-01 executed BluetoothService.exe from C:\\Users\\Public ' +
          'and side-loaded the Chrysalis DLL (T1574.002); elevated token use outside normal ' +
          'service windows over the prior 24h.',
      },
    ],
    log,
    markerId
  );

  // A5: on-call schedule so on_call_lookup (re-pointed at this index) can answer
  // "who is on call". The original run queried a dedicated on-call-schedule
  // index; without it the tool queried the alerts index, which has no responder
  // data, making workflow-execution-b structurally unanswerable.
  await ensureIndexWithDocs(
    esClient,
    ONCALL_INDEX,
    [
      {
        '@timestamp': '2026-07-21T00:00:00.000Z',
        name: 'Dana Whitfield',
        email: 'dana.whitfield@example.com',
        slack_handle: '@dana-w',
        shift_start: '2026-07-20T00:00:00.000Z',
        shift_end: '2026-07-27T00:00:00.000Z',
        is_primary: true,
        escalation_tier: 'primary',
      },
      {
        '@timestamp': '2026-07-21T00:00:00.000Z',
        name: 'Ravi Osei',
        email: 'ravi.osei@example.com',
        slack_handle: '@ravi-o',
        shift_start: '2026-07-20T00:00:00.000Z',
        shift_end: '2026-07-27T00:00:00.000Z',
        is_primary: false,
        escalation_tier: 'secondary',
      },
    ],
    log,
    markerId
  );

  // A4b: watchlist via saved object (kbnClient) — find API on the tankers type.
  try {
    await kbnClient.request({
      method: 'POST',
      path: '/api/security/watchlists',
      body: {
        name: 'Privileged Users',
        description: 'persona-matrix seed: privileged user monitoring watchlist',
        filters: [{ field: 'user.name', value: 'SYSTEM' }],
      },
    });
    log.info(`[env-seed] created watchlist 'Privileged Users'`);
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 409) {
      log.info(`[env-seed] watchlist already exists, reusing`);
    } else {
      // Watchlist API shape may differ across versions; a missing watchlist
      // degrades entity-analytics coverage but must not fail the suite.
      log.warning(`[env-seed] watchlist seed failed (non-fatal): ${err}`);
    }
  }
  void WATCHLIST_SO_TYPE;
}

export async function cleanupEnvSeeds({ esClient, log }: SeedOptions): Promise<void> {
  for (const index of [ENDPOINT_INDEX, LABS_INDEX, TI_INDEX, ENTITY_INDEX]) {
    await esClient.indices.delete({ index }).catch(() => {
      log.info(`[env-seed] cleanup: ${index} already gone`);
    });
  }
}
