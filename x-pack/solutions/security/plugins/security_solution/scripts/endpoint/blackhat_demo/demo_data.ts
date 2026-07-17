/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client, estypes } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * BlackHat 2026 demo seed data — extends the eval-suite forensic kill chain
 * (`@kbn/evals-suite-endpoint`'s `forensic_data.ts`) with the two pieces that
 * suite doesn't need but the live demo does:
 *
 *   1. A third host, WIN-FIN-03 — a lateral target the forensic skill never
 *      touches directly, so the cross-environment hunt (req 9) has a real
 *      "new" host to discover (partial IoC match: same hash, C2, Run-key —
 *      NOT the same offsets/timestamps as the DC, so it reads as a distinct
 *      infection, not a duplicate of the reconstructed chain).
 *   2. A ransomware behavior alert document on the patient-zero host so the
 *      demo can start from Alerts → "Investigate with AI Agent" (req narrative
 *      step 0) instead of raw telemetry.
 *
 * Run standalone against the DEPLOYED PR project (not the eval harness):
 *
 *   node --require ./src/setup_node_env x-pack/solutions/security/plugins/security_solution/scripts/endpoint/blackhat_demo/seed_demo_data.ts \
 *     --kibana https://<deployed-project>.kb.<region>.aws.elastic.cloud \
 *     --node https://<deployed-project>.es.<region>.aws.elastic.cloud \
 *     --username elastic --password <pw>
 *
 * Idempotent: every document carries the shared `eval-agent-` agent-id prefix
 * (or, for the live demo, `blackhat-demo-` — see AGENT_ID_PREFIX) so a rerun
 * after `cleanupBlackhatDemoData()` produces a clean, repeatable state.
 */

export const AGENT_ID_PREFIX = 'blackhat-demo-';

export const DEMO_HOSTS = {
  patientZero: 'WKSTN-RECV01',
  domainController: 'SRV-DC01',
  /** Third host — must be found by the cross-environment hunt, not the forensic reconstruction. */
  lateralFinance: 'WIN-FIN-03',
} as const;

const AGENT_IDS = {
  [DEMO_HOSTS.patientZero]: `${AGENT_ID_PREFIX}wkstn-recv01`,
  [DEMO_HOSTS.domainController]: `${AGENT_ID_PREFIX}srv-dc01`,
  [DEMO_HOSTS.lateralFinance]: `${AGENT_ID_PREFIX}win-fin-03`,
} as const;

const WORKSTATION_OS = {
  name: 'Windows',
  version: '10.0.19045',
  type: 'windows',
  platform: 'windows',
  family: 'windows',
  full: 'Windows 10 Pro',
} as const;

const DC_OS = {
  name: 'Windows',
  version: '10.0.20348',
  type: 'windows',
  platform: 'windows',
  family: 'windows',
  full: 'Windows Server 2022',
} as const;

const SHARED_HASH = 'a3f5c9d1e8b74620fa1c0d5e2b9847361c0ded4488ab2f0e9a7c6b5d4e3f2a10';
const SHARED_C2 = { address: '185.220.101.42', ip: '185.220.101.42', port: 443 };
const SHARED_RUN_KEY = 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Updater';

const PROCESS_INDEX = 'logs-endpoint.events.process-default';
const NETWORK_INDEX = 'logs-endpoint.events.network-default';
const REGISTRY_INDEX = 'logs-endpoint.events.registry-default';
const ALERTS_INDEX = 'logs-endpoint.alerts-default';

interface DemoEvent {
  offsetMinutes: number;
  host: keyof typeof AGENT_IDS;
  index: string;
  document: Record<string, unknown>;
}

const os = (host: keyof typeof AGENT_IDS) =>
  host === DEMO_HOSTS.domainController ? DC_OS : WORKSTATION_OS;

/**
 * WIN-FIN-03: same malware family (hash + C2 + Run-key persistence) as the
 * reconstructed WKSTN-RECV01 → SRV-DC01 chain, but a SEPARATE infection —
 * offset +47min, no lateral-movement link back to the other two hosts in the
 * seeded telemetry itself. The agent has to find it via the IoC hunt
 * (matching hash/C2/registry across all hosts), not by following the chain.
 */
const LATERAL_FINANCE_EVENTS: DemoEvent[] = [
  {
    offsetMinutes: 47,
    host: DEMO_HOSTS.lateralFinance,
    index: PROCESS_INDEX,
    document: {
      event: { category: ['process'], type: ['start'], kind: 'event' },
      process: {
        name: 'UpdateService.exe',
        pid: 6210,
        executable: 'C:\\ProgramData\\svc.exe',
        command_line: 'C:\\ProgramData\\svc.exe',
        hash: { sha256: SHARED_HASH },
        parent: {
          name: 'svchost.exe',
          pid: 1188,
          executable: 'C:\\Windows\\System32\\svchost.exe',
        },
      },
      message: 'svchost.exe spawned UpdateService.exe — same payload hash as the DC ransomware.',
    },
  },
  {
    offsetMinutes: 48,
    host: DEMO_HOSTS.lateralFinance,
    index: NETWORK_INDEX,
    document: {
      event: { category: ['network'], type: ['connection', 'start'], kind: 'event' },
      network: { direction: 'outbound', transport: 'tcp', protocol: 'tls' },
      destination: SHARED_C2,
      process: { name: 'UpdateService.exe', pid: 6210 },
      message: 'Outbound TLS beacon to the same C2 (185.220.101.42:443) seen on WKSTN-RECV01.',
    },
  },
  {
    offsetMinutes: 49,
    host: DEMO_HOSTS.lateralFinance,
    index: REGISTRY_INDEX,
    document: {
      event: { category: ['registry'], type: ['change'], kind: 'event' },
      registry: {
        path: SHARED_RUN_KEY,
        key: 'Updater',
        value: 'C:\\ProgramData\\svc.exe',
      },
      process: { name: 'UpdateService.exe', pid: 6210 },
      message: 'Same Run-key persistence pattern as SRV-DC01 — Updater → svc.exe.',
    },
  },
];

/** Elastic Defend ransomware-behavior alert on the patient-zero host — the demo's entry point. */
function buildRansomwareAlert(baseTime: Date, agentIdOverrides: AgentIdOverrides) {
  const agentId = agentIdOverrides[DEMO_HOSTS.patientZero] ?? AGENT_IDS[DEMO_HOSTS.patientZero];
  const timestamp = new Date(baseTime.getTime() + 1 * 60 * 1000).toISOString();

  return {
    '@timestamp': timestamp,
    agent: { id: agentId, type: 'endpoint', version: '9.5.0-SNAPSHOT' },
    elastic: { agent: { id: agentId } },
    host: { name: DEMO_HOSTS.patientZero, hostname: DEMO_HOSTS.patientZero, os: WORKSTATION_OS },
    data_stream: { type: 'logs', dataset: 'endpoint.alerts', namespace: 'default' },
    event: {
      kind: 'alert',
      category: ['malware'],
      type: ['start'],
      module: 'endpoint',
      dataset: 'endpoint.alerts',
      action: 'ransomware_detected',
    },
    process: {
      name: 'powershell.exe',
      pid: 4821,
      executable: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      parent: { name: 'OUTLOOK.EXE', pid: 3120 },
      hash: { sha256: SHARED_HASH },
    },
    rule: { name: 'Ransomware Behavior Detected', id: 'blackhat-demo-ransomware-rule' },
    message:
      'Elastic Defend: ransomware-pattern behavior detected on WKSTN-RECV01 (encoded PowerShell → payload drop → C2 beacon).',
  };
}

type AgentIdOverrides = Partial<Record<keyof typeof AGENT_IDS, string>>;

export async function seedBlackhatDemoData(
  { esClient }: { esClient: Client },
  log: ToolingLog,
  baseTime: Date = new Date(Date.now() - 3 * 60 * 60 * 1000),
  /**
   * Maps a seeded host to a REAL Fleet-enrolled agent UUID (see the matching
   * param on `seedForensicTimeline`). Pass the actual `agent.id` values from
   * `GET /api/fleet/agents` for the live demo so downstream Osquery live
   * queries dispatch against agents that really exist.
   */
  agentIdOverrides: AgentIdOverrides = {}
): Promise<void> {
  const eventOps = LATERAL_FINANCE_EVENTS.flatMap((event) => {
    const agentId = agentIdOverrides[event.host] ?? AGENT_IDS[event.host];
    const timestamp = new Date(baseTime.getTime() + event.offsetMinutes * 60 * 1000).toISOString();
    const [, dataset] = event.index.match(/^logs-(endpoint\.events\.[a-z]+)-default$/) ?? [];

    return [
      { create: { _index: event.index } },
      {
        '@timestamp': timestamp,
        agent: { id: agentId, type: 'endpoint', version: '9.5.0-SNAPSHOT' },
        elastic: { agent: { id: agentId } },
        host: { name: event.host, hostname: event.host, os: os(event.host) },
        data_stream: dataset ? { type: 'logs', dataset, namespace: 'default' } : undefined,
        ...event.document,
        event: {
          ...(event.document.event as Record<string, unknown>),
          module: 'endpoint',
          dataset,
        },
      },
    ];
  });

  const operations = [
    ...eventOps,
    { create: { _index: ALERTS_INDEX } },
    buildRansomwareAlert(baseTime, agentIdOverrides),
  ];

  const response = await esClient.bulk({ operations, refresh: true });

  if (response.errors) {
    const firstError = response.items.find((item) => item.create?.error)?.create?.error;
    throw new Error(
      `seedBlackhatDemoData: bulk index failed: ${JSON.stringify(firstError ?? 'unknown error')}`
    );
  }

  log.info(
    `Seeded WIN-FIN-03 lateral-infection events (${LATERAL_FINANCE_EVENTS.length}) + 1 ransomware alert on ${DEMO_HOSTS.patientZero}.`
  );
}

export async function cleanupBlackhatDemoData({ esClient }: { esClient: Client }): Promise<void> {
  const indices = [PROCESS_INDEX, NETWORK_INDEX, REGISTRY_INDEX, ALERTS_INDEX];

  // Match on `host.hostname` / `host.name` (stable across reseeds), not just
  // the legacy `blackhat-demo-*` placeholder agent-id prefix. Once agent-id
  // overrides resolve to REAL Fleet agent ids (see resolveAgentIds in
  // seed_demo_data.ts), those ids change every time the demo VMs are
  // re-enrolled/upgraded — a prefix-only cleanup silently stopped matching
  // anything after the first real-agent-id seed run, leaving every prior
  // generation's docs (with now-stale agent ids) behind to duplicate/conflict
  // with the fresh reseed.  Some docs carry `host.hostname` but not `host.name`
  // (the forensic kill-chain events), so we match on both.
  const hostnames = Object.values(DEMO_HOSTS);
  const deleteQuery: estypes.QueryDslQueryContainer = {
    bool: {
      should: [
        { prefix: { 'agent.id': AGENT_ID_PREFIX } },
        { terms: { 'host.hostname': hostnames } },
        { terms: { 'host.name': hostnames } },
      ],
    },
  };

  await Promise.all(
    indices.map((index) =>
      esClient
        .deleteByQuery({ index, query: deleteQuery, refresh: true, ignore_unavailable: true })
        .catch(() => {})
    )
  );
}
