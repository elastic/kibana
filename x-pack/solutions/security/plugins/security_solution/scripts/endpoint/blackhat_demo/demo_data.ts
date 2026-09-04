/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client, estypes } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * BlackHat 2026 demo seed data — extends the forensic kill chain with:
 *
 * 1. WIN-FIN-03 — a third host the forensic reconstruction does not walk, so an
 *    IoC hunt can still find another infected machine (same hash / C2 / Run-key).
 * 2. Elastic Defend alerts on the kill-chain hosts so Endpoint Security can
 *    mint Detection Engine alerts, which Attack Discovery can cluster.
 */

export const AGENT_ID_PREFIX = 'blackhat-demo-';

export const DEMO_HOSTS = {
  patientZero: 'WKSTN-RECV01',
  domainController: 'SRV-DC01',
  lateralFinance: 'WIN-FIN-03',
} as const;

export type DemoHostName = (typeof DEMO_HOSTS)[keyof typeof DEMO_HOSTS];

const AGENT_IDS: Record<DemoHostName, string> = {
  [DEMO_HOSTS.patientZero]: `${AGENT_ID_PREFIX}wkstn-recv01`,
  [DEMO_HOSTS.domainController]: `${AGENT_ID_PREFIX}srv-dc01`,
  [DEMO_HOSTS.lateralFinance]: `${AGENT_ID_PREFIX}win-fin-03`,
};

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
export const PATIENT_ZERO_USER = 'r.martinez';

const PROCESS_INDEX = 'logs-endpoint.events.process-default';
const NETWORK_INDEX = 'logs-endpoint.events.network-default';
const REGISTRY_INDEX = 'logs-endpoint.events.registry-default';
const FILE_INDEX = 'logs-endpoint.events.file-default';
const ALERTS_INDEX = 'logs-endpoint.alerts-default';

const PROMOTED_ALERT_INDICES = [
  '.internal.alerts-security.alerts-default-*',
  '.alerts-security.alerts-default',
];

interface DemoEvent {
  offsetMinutes: number;
  host: DemoHostName;
  index: string;
  document: Record<string, unknown>;
}

export type AgentIdOverrides = Partial<Record<DemoHostName, string>>;

/** Inclusive span from offset 0 through the latest WIN-FIN-03 / alert event. */
export const DEMO_TIMELINE_DURATION_MINUTES = 50;

const os = (host: DemoHostName) => (host === DEMO_HOSTS.domainController ? DC_OS : WORKSTATION_OS);

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

const endpointAlert = ({
  offsetMinutes,
  host,
  action,
  message,
  process,
  userName,
}: {
  offsetMinutes: number;
  host: DemoHostName;
  action: string;
  message: string;
  process: Record<string, unknown>;
  userName?: string;
}): DemoEvent => ({
  offsetMinutes,
  host,
  index: ALERTS_INDEX,
  document: {
    event: {
      kind: 'alert',
      category: ['malware'],
      type: ['start'],
      module: 'endpoint',
      dataset: 'endpoint.alerts',
      action,
    },
    process,
    rule: { name: 'Ransomware Behavior Detected', id: 'blackhat-demo-ransomware-rule' },
    message,
    ...(userName != null ? { user: { name: userName } } : {}),
  },
});

/**
 * Endpoint Security (`event.kind:alert and event.module:endpoint`) mints one
 * Detection Engine alert per document. Several staged alerts on the patient-zero
 * host give Attack Discovery a ransomware cluster instead of a single signal.
 */
const ENDPOINT_ALERTS: DemoEvent[] = [
  endpointAlert({
    offsetMinutes: 1,
    host: DEMO_HOSTS.patientZero,
    action: 'ransomware_detected',
    message:
      'Elastic Defend: ransomware-pattern behavior detected on WKSTN-RECV01 (encoded PowerShell → payload drop → C2 beacon).',
    process: {
      name: 'powershell.exe',
      pid: 4821,
      executable: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      parent: { name: 'OUTLOOK.EXE', pid: 3120 },
      hash: { sha256: SHARED_HASH },
    },
    userName: PATIENT_ZERO_USER,
  }),
  endpointAlert({
    offsetMinutes: 12,
    host: DEMO_HOSTS.patientZero,
    action: 'credential_access',
    message: 'Elastic Defend: rundll32 loaded update.dll and accessed lsass.exe on WKSTN-RECV01.',
    process: {
      name: 'rundll32.exe',
      pid: 5102,
      executable: 'C:\\Windows\\System32\\rundll32.exe',
      command_line: 'rundll32.exe C:\\Users\\Public\\update.dll,DllMain',
      parent: { name: 'powershell.exe', pid: 4821 },
      hash: { sha256: SHARED_HASH },
    },
    userName: PATIENT_ZERO_USER,
  }),
  endpointAlert({
    offsetMinutes: 20,
    host: DEMO_HOSTS.patientZero,
    action: 'lateral_movement',
    message: 'Elastic Defend: SMB lateral movement from WKSTN-RECV01 to SRV-DC01.',
    process: { name: 'rundll32.exe', pid: 5102 },
    userName: PATIENT_ZERO_USER,
  }),
  endpointAlert({
    offsetMinutes: 40,
    host: DEMO_HOSTS.domainController,
    action: 'ransomware_detected',
    message: 'Elastic Defend: mass file encryption and ransom note on SRV-DC01.',
    process: { name: 'svc.exe', pid: 8290, hash: { sha256: SHARED_HASH } },
  }),
];

const toBulkOps = (
  events: DemoEvent[],
  baseTime: Date,
  agentIdOverrides: AgentIdOverrides
): object[] =>
  events.flatMap((event) => {
    const agentId = agentIdOverrides[event.host] ?? AGENT_IDS[event.host];
    const timestamp = new Date(baseTime.getTime() + event.offsetMinutes * 60 * 1000).toISOString();
    const [, dataset] =
      event.index.match(/^logs-(endpoint\.(?:events\.[a-z]+|alerts))-default$/) ?? [];

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

export async function seedBlackhatDemoData(
  { esClient }: { esClient: Client },
  log: ToolingLog,
  baseTime: Date = new Date(Date.now() - 3 * 60 * 60 * 1000),
  agentIdOverrides: AgentIdOverrides = {}
): Promise<void> {
  const operations = [
    ...toBulkOps(LATERAL_FINANCE_EVENTS, baseTime, agentIdOverrides),
    ...toBulkOps(ENDPOINT_ALERTS, baseTime, agentIdOverrides),
  ];

  const response = await esClient.bulk({ operations, refresh: true });

  if (response.errors) {
    const firstError = response.items.find((item) => item.create?.error)?.create?.error;
    throw new Error(
      `seedBlackhatDemoData: bulk index failed: ${JSON.stringify(firstError ?? 'unknown error')}`
    );
  }

  log.info(
    `Seeded WIN-FIN-03 lateral-infection events (${LATERAL_FINANCE_EVENTS.length}) + ${ENDPOINT_ALERTS.length} Elastic Defend alerts.`
  );
}

export async function cleanupBlackhatDemoData({
  esClient,
  spaceId = 'default',
}: {
  esClient: Client;
  spaceId?: string;
}): Promise<void> {
  const indices = [PROCESS_INDEX, NETWORK_INDEX, REGISTRY_INDEX, FILE_INDEX, ALERTS_INDEX];
  const hostnames = Object.values(DEMO_HOSTS);
  const deleteQuery: estypes.QueryDslQueryContainer = {
    bool: {
      should: [
        { prefix: { 'agent.id': AGENT_ID_PREFIX } },
        { prefix: { 'agent.id': 'eval-agent-forensic-' } },
        { terms: { 'host.hostname': hostnames } },
        { terms: { 'host.name': hostnames } },
      ],
      minimum_should_match: 1,
    },
  };

  await Promise.all(
    indices.map((index) =>
      esClient
        .deleteByQuery({ index, query: deleteQuery, refresh: true, ignore_unavailable: true })
        .catch(() => undefined)
    )
  );

  const promoted = [
    ...PROMOTED_ALERT_INDICES,
    `.internal.alerts-security.alerts-${spaceId}-*`,
    `.alerts-security.alerts-${spaceId}`,
  ];

  await Promise.all(
    promoted.map((index) =>
      esClient
        .deleteByQuery({
          index,
          query: deleteQuery,
          refresh: true,
          ignore_unavailable: true,
          conflicts: 'proceed',
        })
        .catch(() => undefined)
    )
  );
}
