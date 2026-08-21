/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * Endpoint telemetry seed for the Deep Watch Forensics leaf-quality and
 * durable-outcome suites.
 *
 * `deep_watch.produce_draft_forensic_report` queries `logs-endpoint.events.*`
 * via ES|QL to build a real timeline and validate source IoCs. Without seeded
 * telemetry the query always returns zero rows, `timeline_event_count` is
 * pinned at 0 for every example regardless of model, and the agent correctly
 * (and unhelpfully, for scoring purposes) reports "insufficient evidence"
 * instead of exercising the report-generation path at all.
 *
 * Hosts/IoCs here are deliberately aligned 1:1 with `../dataset.ts` — do not
 * rename either side without updating the other.
 *
 * Modeled on the sibling `kbn-evals-suite-endpoint/src/data_generators/
 * forensic_data.ts` seeder (endpoint-forensic-analysis suite), which pairs a
 * `WKSTN-RECV01` / `SRV-DC01` kill chain with the same event-shape scheme.
 * Deep Watch's dataset uses different fictional hosts, so this is a
 * suite-local seeder rather than a cross-package import — see
 * `feedback_kbn_evals_keep_suites_separate.md`: cohort-isolated eval suites
 * (different owning teams, different lifecycles) should not be merged into a
 * shared package even when their data-generation code rhymes.
 *
 * Agent ids use the shared `eval-agent-` prefix so cleanupSeededData()
 * reclaims them via the standard prefix-based deleteByQuery.
 */

const EVAL_AGENT_ID_PREFIX = 'eval-agent-dwf-';

export const FORENSIC_HOSTS = {
  /** dwf-apt29-lateral-movement: patient zero. */
  apt29Workstation: 'DESKTOP-APT29',
  /** dwf-apt29-lateral-movement: lateral-movement target. */
  apt29DomainController: 'SERVER-DC01',
  /** dwf-rundll32-persistence: single-host persistence scenario. */
  rundll32Host: 'WEB-SERVER-01',
  /** dwf-supply-chain-initial-access: single-host supply-chain scenario. */
  supplyChainHost: 'DEV-WKS-07',
} as const;

const AGENT_IDS = {
  [FORENSIC_HOSTS.apt29Workstation]: `${EVAL_AGENT_ID_PREFIX}desktop-apt29`,
  [FORENSIC_HOSTS.apt29DomainController]: `${EVAL_AGENT_ID_PREFIX}server-dc01`,
  [FORENSIC_HOSTS.rundll32Host]: `${EVAL_AGENT_ID_PREFIX}web-server-01`,
  [FORENSIC_HOSTS.supplyChainHost]: `${EVAL_AGENT_ID_PREFIX}dev-wks-07`,
} as const;

const WORKSTATION_OS = {
  name: 'Windows',
  version: '10.0.19045',
  type: 'windows',
  platform: 'windows',
  family: 'windows',
  full: 'Windows 10 Pro',
} as const;

const SERVER_OS = {
  name: 'Windows',
  version: '10.0.20348',
  type: 'windows',
  platform: 'windows',
  family: 'windows',
  full: 'Windows Server 2022',
} as const;

const PROCESS_INDEX = 'logs-endpoint.events.process-default';
const NETWORK_INDEX = 'logs-endpoint.events.network-default';
const REGISTRY_INDEX = 'logs-endpoint.events.registry-default';
// Deliberately no FILE_INDEX seed: every `file_hash` IoC in ../dataset.ts
// expects `status: 'not_found'` — seeding a matching hash would flip the
// golden label. Timeline events still populate from process/network/registry.

interface ForensicEvent {
  /** Minutes after the base time; unique per host to yield an ordered timeline. */
  offsetMinutes: number;
  host: keyof typeof AGENT_IDS;
  index: string;
  /** ECS body excluding `@timestamp`, `agent`, `elastic`, `host` (added by the seeder). */
  document: Record<string, unknown>;
}

const os = (host: keyof typeof AGENT_IDS) =>
  host === FORENSIC_HOSTS.apt29DomainController ? SERVER_OS : WORKSTATION_OS;

/**
 * Ordered event sets, one per `dataset.ts` example. Every event carries a
 * distinct `@timestamp` so an ascending sort is a real timeline, and the
 * network/file/registry IoCs referenced in `dataset.ts`'s
 * `expectedIocs: [...{ status: 'confirmed' }]` entries are actually present
 * so `buildIocValidationQuery()` can resolve them.
 */
const EVENTS: ForensicEvent[] = [
  // ── dwf-apt29-lateral-movement: DESKTOP-APT29 -> SERVER-DC01 ──────────────
  {
    offsetMinutes: 0,
    host: FORENSIC_HOSTS.apt29Workstation,
    index: PROCESS_INDEX,
    document: {
      event: { category: ['process'], type: ['start'], kind: 'event' },
      process: {
        name: 'powershell.exe',
        pid: 4821,
        executable: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
        command_line: 'powershell.exe -nop -w hidden -enc SQBFAFgAKABJAFcAUgAoACcAaAB0AHQAcAA6AC8A',
        parent: { name: 'OUTLOOK.EXE', pid: 3120 },
      },
      message: 'OUTLOOK.EXE spawned an encoded PowerShell command (phishing attachment macro).',
    },
  },
  {
    offsetMinutes: 3,
    host: FORENSIC_HOSTS.apt29Workstation,
    index: NETWORK_INDEX,
    document: {
      event: { category: ['network'], type: ['connection', 'start'], kind: 'event' },
      network: { direction: 'outbound', transport: 'tcp', protocol: 'tls' },
      destination: { address: '185.220.101.42', ip: '185.220.101.42', port: 443 },
      process: { name: 'powershell.exe' },
      message: 'Outbound TLS beacon to C2 185.220.101.42:443.',
    },
  },
  {
    offsetMinutes: 6,
    host: FORENSIC_HOSTS.apt29Workstation,
    index: REGISTRY_INDEX,
    document: {
      event: { category: ['registry'], type: ['change'], kind: 'event' },
      registry: {
        path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Updater',
        value: 'Updater',
        data: { strings: ['C:\\Users\\Public\\update.exe'] },
      },
      process: { name: 'powershell.exe' },
      message: 'Registry Run key created for persistence.',
    },
  },
  {
    offsetMinutes: 15,
    host: FORENSIC_HOSTS.apt29Workstation,
    index: NETWORK_INDEX,
    document: {
      event: { category: ['network'], type: ['connection', 'start'], kind: 'event' },
      network: { direction: 'outbound', transport: 'tcp', protocol: 'smb' },
      destination: {
        domain: FORENSIC_HOSTS.apt29DomainController,
        ip: '10.0.0.11',
        port: 445,
      },
      process: { name: 'powershell.exe' },
      message: 'SMB (445) connection from DESKTOP-APT29 to SERVER-DC01.',
    },
  },
  {
    offsetMinutes: 17,
    host: FORENSIC_HOSTS.apt29DomainController,
    index: PROCESS_INDEX,
    document: {
      event: { category: ['process'], type: ['start'], kind: 'event' },
      process: {
        name: 'cmd.exe',
        pid: 7010,
        executable: 'C:\\Windows\\System32\\cmd.exe',
        command_line: 'cmd.exe /c whoami',
        parent: { name: 'wmiprvse.exe', pid: 2440 },
      },
      message: 'Remote command execution on SERVER-DC01 via WMI.',
    },
  },
  // ── dwf-rundll32-persistence: WEB-SERVER-01 ───────────────────────────────
  {
    offsetMinutes: 0,
    host: FORENSIC_HOSTS.rundll32Host,
    index: PROCESS_INDEX,
    document: {
      event: { category: ['process'], type: ['start'], kind: 'event' },
      process: {
        name: 'rundll32.exe',
        pid: 5511,
        executable: 'C:\\Windows\\System32\\rundll32.exe',
        command_line: 'rundll32.exe C:\\Windows\\Temp\\flashupdate.dll,DllMain',
        parent: { name: 'explorer.exe', pid: 1024 },
      },
      message: 'rundll32 spawning suspicious DLL from temp directory.',
    },
  },
  {
    offsetMinutes: 2,
    host: FORENSIC_HOSTS.rundll32Host,
    index: REGISTRY_INDEX,
    document: {
      event: { category: ['registry'], type: ['change'], kind: 'event' },
      registry: {
        path: 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\FlashUpdateSvc',
        value: 'FlashUpdateSvc',
        data: { strings: ['C:\\Windows\\Temp\\flashupdate.dll'] },
      },
      process: { name: 'rundll32.exe' },
      message: 'Registry run key FlashUpdateSvc created for persistence.',
    },
  },
  {
    offsetMinutes: 4,
    host: FORENSIC_HOSTS.rundll32Host,
    index: NETWORK_INDEX,
    document: {
      event: { category: ['network'], type: ['connection', 'start'], kind: 'event' },
      network: { direction: 'outbound', transport: 'tcp', protocol: 'unknown' },
      destination: { address: '192.168.1.100', ip: '192.168.1.100', port: 4444 },
      process: { name: 'rundll32.exe' },
      message: 'Network beacon to 192.168.1.100:4444.',
    },
  },
  // ── dwf-supply-chain-initial-access: DEV-WKS-07 ───────────────────────────
  {
    offsetMinutes: 0,
    host: FORENSIC_HOSTS.supplyChainHost,
    index: PROCESS_INDEX,
    document: {
      event: { category: ['process'], type: ['start'], kind: 'event' },
      process: {
        name: 'node.exe',
        pid: 6002,
        executable: 'C:\\Program Files\\nodejs\\node.exe',
        command_line: 'npm install @trusted/build-utils',
        parent: { name: 'cmd.exe', pid: 5980 },
      },
      message: 'npm postinstall script executed obfuscated payload.',
    },
  },
  {
    offsetMinutes: 1,
    host: FORENSIC_HOSTS.supplyChainHost,
    index: NETWORK_INDEX,
    document: {
      event: { category: ['network'], type: ['connection', 'start'], kind: 'event' },
      network: { direction: 'outbound', transport: 'tcp', protocol: 'tls' },
      destination: { address: '203.0.113.77', ip: '203.0.113.77', port: 443 },
      process: { name: 'node.exe' },
      message: 'Outbound C2 connection established by npm postinstall script.',
    },
  },
  {
    offsetMinutes: 3,
    host: FORENSIC_HOSTS.supplyChainHost,
    index: REGISTRY_INDEX,
    document: {
      event: { category: ['registry'], type: ['change'], kind: 'event' },
      registry: {
        path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\NodeUpdater',
        value: 'NodeUpdater',
        data: { strings: ['C:\\Users\\dev\\AppData\\Roaming\\node-updater.exe'] },
      },
      process: { name: 'node.exe' },
      message: 'Registry run key created for persistence after supply-chain compromise.',
    },
  },
];

/**
 * Bulk-index the Deep Watch Forensics seed events into `logs-endpoint.events.*`.
 * Idempotent when paired with cleanupSeededData() in beforeAll (reclaims by
 * the `eval-agent-dwf-` prefix).
 */
export async function seedForensicTimeline(
  { esClient }: { esClient: Client },
  log: ToolingLog,
  baseTime: Date = new Date(Date.now() - 3 * 60 * 60 * 1000)
): Promise<void> {
  const operations = EVENTS.flatMap((event) => {
    const agentId = AGENT_IDS[event.host];
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

  const response = await esClient.bulk({ operations, refresh: true });

  if (response.errors) {
    const firstError = response.items.find((item) => item.create?.error)?.create?.error;
    throw new Error(
      `seedForensicTimeline: bulk index failed: ${JSON.stringify(firstError ?? 'unknown error')}`
    );
  }

  log.info(
    `Seeded ${EVENTS.length} Deep Watch Forensics telemetry events across ` +
      `${Object.keys(AGENT_IDS).length} hosts (${Object.keys(AGENT_IDS).join(', ')}).`
  );
}

/** Agent id prefix used by this seeder — exported for cleanup.ts's deleteByQuery. */
export const DEEP_WATCH_EVAL_AGENT_ID_PREFIX = EVAL_AGENT_ID_PREFIX;
