/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Background Noise Generator — Phase 3
 *
 * Produces realistic but benign ECS documents that create background
 * noise around the attack chain. This makes detection scenarios more
 * realistic by adding the kind of normal activity a real endpoint would
 * produce — legitimate process executions, file reads, network
 * connections to known-good domains, etc.
 *
 * Noise docs should NOT trigger detection rules (they represent
 * normal activity, not attacks).
 */

import { v4 as uuidv4 } from 'uuid';

// ─── Types ─────────────────────────────────────────────────────────────

export interface NoiseOptions {
  /** Number of noise documents to generate. */
  count: number;
  /** Base timestamp (noise spread around this). */
  baseTimestamp: string;
  /** Time window to spread noise across (ms). Default: 60000 (1 min). */
  spreadMs?: number;
  /** Host info to use in noise docs. */
  hostId: string;
  hostName: string;
  /** OS type for realistic process names. */
  os: 'windows' | 'linux' | 'macos';
  /** Optional: user names to randomly assign. */
  userNames?: string[];
  /** Optional: include red herrings (suspicious-looking but benign). Default: false. */
  includeRedHerrings?: boolean;
}

export interface NoiseDocument {
  '@timestamp': string;
  event: {
    category: string[];
    type: string[];
    kind: 'event';
    dataset: 'emulation.noise';
    module: 'emulation';
  };
  process: {
    name: string;
    pid: number;
    entity_id: string;
    executable: string;
    command_line: string;
    parent: {
      name: string;
      pid: number;
      entity_id: string;
    };
  };
  host: { id: string; name: string; os: { type: string } };
  user: { name: string };
  agent: { type: 'endpoint' };
  kibana: {
    alert: {
      emulation: {
        id: string;
        mode: 'noise';
        scenarioFingerprint: string;
      };
    };
  };
  // Optional ECS fields that may appear on noise docs
  file?: { name: string; path: string; extension: string };
  network?: { direction: string; transport: string };
  destination?: { ip: string; port: number; domain: string };
  source?: { ip: string; port: number };
  dns?: { question: { name: string; type: string } };
  registry?: { path: string; data: { strings: string[] } };
}

// ─── Benign activity templates ─────────────────────────────────────────

interface BenignActivity {
  event: { category: string[]; type: string[] };
  process: { name: string; parent: string; commandLine: string };
  /** Extra ECS fields for this activity type. */
  extras?: Partial<Pick<NoiseDocument, 'file' | 'network' | 'destination' | 'source' | 'dns' | 'registry'>>;
}

const WINDOWS_BENIGN: BenignActivity[] = [
  {
    event: { category: ['process'], type: ['start'] },
    process: { name: 'svchost.exe', parent: 'services.exe', commandLine: 'C:\\Windows\\System32\\svchost.exe -k netsvcs' },
  },
  {
    event: { category: ['process'], type: ['start'] },
    process: { name: 'conhost.exe', parent: 'csrss.exe', commandLine: 'C:\\Windows\\System32\\conhost.exe 0x4' },
  },
  {
    event: { category: ['process'], type: ['start'] },
    process: { name: 'SearchIndexer.exe', parent: 'services.exe', commandLine: 'C:\\Windows\\System32\\SearchIndexer.exe /Embedding' },
  },
  {
    event: { category: ['file'], type: ['creation'] },
    process: { name: 'chrome.exe', parent: 'explorer.exe', commandLine: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
    extras: { file: { name: 'cache_data_0', path: 'C:\\Users\\user\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Cache', extension: '' } },
  },
  {
    event: { category: ['network'], type: ['connection'] },
    process: { name: 'chrome.exe', parent: 'explorer.exe', commandLine: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
    extras: {
      network: { direction: 'egress', transport: 'tcp' },
      destination: { ip: '142.250.80.46', port: 443, domain: 'www.google.com' },
      source: { ip: '10.0.0.5', port: 49152 },
    },
  },
  {
    event: { category: ['process'], type: ['start'] },
    process: { name: 'MsMpEng.exe', parent: 'services.exe', commandLine: 'C:\\ProgramData\\Microsoft\\Windows Defender\\Platform\\MsMpEng.exe' },
  },
  {
    event: { category: ['registry'], type: ['access'] },
    process: { name: 'explorer.exe', parent: 'userinit.exe', commandLine: 'C:\\Windows\\explorer.exe' },
    extras: { registry: { path: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders', data: { strings: ['C:\\Users\\Public\\Desktop'] } } },
  },
  {
    event: { category: ['network'], type: ['connection'] },
    process: { name: 'svchost.exe', parent: 'services.exe', commandLine: 'C:\\Windows\\System32\\svchost.exe -k NetworkService' },
    extras: {
      network: { direction: 'egress', transport: 'tcp' },
      destination: { ip: '13.107.42.14', port: 443, domain: 'settings-win.data.microsoft.com' },
      dns: { question: { name: 'settings-win.data.microsoft.com', type: 'A' } },
    },
  },
];

const LINUX_BENIGN: BenignActivity[] = [
  {
    event: { category: ['process'], type: ['start'] },
    process: { name: 'cron', parent: 'systemd', commandLine: '/usr/sbin/cron -f' },
  },
  {
    event: { category: ['process'], type: ['start'] },
    process: { name: 'apt-check', parent: 'cron', commandLine: '/usr/lib/update-notifier/apt-check --human-readable' },
  },
  {
    event: { category: ['network'], type: ['connection'] },
    process: { name: 'systemd-resolved', parent: 'systemd', commandLine: '/lib/systemd/systemd-resolved' },
    extras: {
      network: { direction: 'egress', transport: 'udp' },
      destination: { ip: '8.8.8.8', port: 53, domain: 'archive.ubuntu.com' },
    },
  },
  {
    event: { category: ['file'], type: ['modification'] },
    process: { name: 'rsyslogd', parent: 'systemd', commandLine: '/usr/sbin/rsyslogd -n -iNONE' },
    extras: { file: { name: 'syslog', path: '/var/log/syslog', extension: '' } },
  },
];

// ─── Red herrings (suspicious-looking but benign) ──────────────────────

const RED_HERRINGS: BenignActivity[] = [
  {
    // Legitimate scheduled task management
    event: { category: ['process'], type: ['start'] },
    process: { name: 'schtasks.exe', parent: 'explorer.exe', commandLine: 'schtasks.exe /query /tn "\\Microsoft\\Windows\\Defrag\\ScheduledDefrag"' },
  },
  {
    // Legitimate PowerShell usage (not encoded, not suspicious flags)
    event: { category: ['process'], type: ['start'] },
    process: { name: 'powershell.exe', parent: 'explorer.exe', commandLine: 'powershell.exe -Command "Get-Date"' },
  },
  {
    // Legitimate reg query (not modification)
    event: { category: ['process'], type: ['start'] },
    process: { name: 'reg.exe', parent: 'cmd.exe', commandLine: 'reg.exe query HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion /v ProgramFilesDir' },
  },
];

// ─── Core ──────────────────────────────────────────────────────────────

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pickRandom = <T>(arr: T[]): T => arr[randomInt(0, arr.length - 1)];

/**
 * Generate background noise documents that simulate normal endpoint activity.
 */
export function generateNoise(
  scenarioId: string,
  scenarioFingerprint: string,
  options: NoiseOptions
): NoiseDocument[] {
  const {
    count,
    baseTimestamp,
    spreadMs = 60000,
    hostId,
    hostName,
    os,
    userNames = ['SYSTEM', 'user', 'admin'],
    includeRedHerrings = false,
  } = options;

  const pool: BenignActivity[] = [
    ...(os === 'windows' ? WINDOWS_BENIGN : LINUX_BENIGN),
    ...(includeRedHerrings ? RED_HERRINGS : []),
  ];

  const docs: NoiseDocument[] = [];
  const baseMs = new Date(baseTimestamp).getTime();

  for (let i = 0; i < count; i++) {
    const activity = pickRandom(pool);
    const timestamp = new Date(baseMs + randomInt(-spreadMs, spreadMs)).toISOString();
    const parentEntityId = uuidv4();
    const processEntityId = uuidv4();

    const doc: NoiseDocument = {
      '@timestamp': timestamp,
      event: {
        ...activity.event,
        kind: 'event',
        dataset: 'emulation.noise',
        module: 'emulation',
      },
      process: {
        name: activity.process.name,
        pid: randomInt(100, 65535),
        entity_id: processEntityId,
        executable: os === 'windows'
          ? `C:\\Windows\\System32\\${activity.process.name}`
          : `/usr/bin/${activity.process.name}`,
        command_line: activity.process.commandLine,
        parent: {
          name: activity.process.parent,
          pid: randomInt(1, 10000),
          entity_id: parentEntityId,
        },
      },
      host: { id: hostId, name: hostName, os: { type: os } },
      user: { name: pickRandom(userNames) },
      agent: { type: 'endpoint' },
      kibana: {
        alert: {
          emulation: {
            id: scenarioId,
            mode: 'noise',
            scenarioFingerprint,
          },
        },
      },
      ...activity.extras,
    };

    docs.push(doc);
  }

  // Sort by timestamp
  docs.sort((a, b) => new Date(a['@timestamp']).getTime() - new Date(b['@timestamp']).getTime());

  return docs;
}
