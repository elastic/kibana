/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. See the Elastic License 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

const ALERT_INDEX = '.internal.alerts-security.alerts-default-000001';
export const TELEMETRY_INDEX = 'logs-windows.sysmon_operational-default';
export const ENTITY_RISK_INDEX = '.entities.v1.latest.security_risk_score-default-000001';
export const SECURITY_LABS_INDEX = 'security-labs-content-default';

/**
 * Seed profile:
 *  - `minimal` (default): the original 3-alert / single-rule fixture, byte-for-byte
 *    behavior preserved so scores stay comparable with the original published
 *    matrix runs.
 *  - `enriched`: adds multi-rule alerts plus the data sources the prompts
 *    reference (Windows endpoint telemetry, entity risk scores, Security Labs
 *    content). Opt in with SEED_PROFILE=enriched; run under a separate
 *    experiment label — scores across profiles are NOT comparable.
 */
export type SeedProfile = 'minimal' | 'enriched';
export const seedProfile: SeedProfile =
  process.env.SEED_PROFILE === 'enriched' ? 'enriched' : 'minimal';

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

const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();

// --- Enriched profile fixtures -------------------------------------------------

const enrichedAlerts: AlertDoc[] = [
  { ...baseAlert },
  {
    ...baseAlert,
    '@timestamp': minutesAgo(12),
    'kibana.alert.risk_score': 63,
  },
  {
    ...baseAlert,
    '@timestamp': minutesAgo(24),
    'kibana.alert.risk_score': 53,
  },
  {
    '@timestamp': minutesAgo(35),
    'kibana.alert.rule.name': 'Credential Dumping via Mimikatz',
    'kibana.alert.severity': 'critical',
    'kibana.alert.risk_score': 91,
    'kibana.alert.reason': 'LSASS access via comsvcs MiniDump detected on Windows endpoint',
    'host.name': 'srv-win-finance-02',
    'user.name': 'CORP\\j.ramirez',
    'process.name': 'rundll32.exe',
    'process.command_line': 'rundll32.exe C:\\windows\\system32\\comsvcs.dll, MiniDump 672 lsass.dmp full',
    'file.hash.sha256': '9b7d3a2c1e0f48619c2bd7e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5',
    'event.category': ['malware', 'process'],
    'event.type': ['start'],
    'kibana.alert.workflow_status': 'open',
  },
  {
    '@timestamp': minutesAgo(58),
    'kibana.alert.rule.name': 'Suspicious PowerShell Encoded Command',
    'kibana.alert.severity': 'high',
    'kibana.alert.risk_score': 78,
    'kibana.alert.reason': 'base64-encoded powershell invocation with download cradle',
    'host.name': 'wkstn-win-hr-14',
    'user.name': 'CORP\\a.novak',
    'process.name': 'powershell.exe',
    'process.command_line': 'powershell.exe -nop -w hidden -enc SQBFAFgAIAAoAE4AZQB3...',
    'event.category': ['process'],
    'event.type': ['start'],
    'kibana.alert.workflow_status': 'acknowledged',
  },
  {
    '@timestamp': minutesAgo(96),
    'kibana.alert.rule.name': 'Unusual Outbound SMB Connection',
    'kibana.alert.severity': 'medium',
    'kibana.alert.risk_score': 47,
    'kibana.alert.reason': 'workstation initiated SMB session to non-domain server',
    'host.name': 'wkstn-win-hr-14',
    'user.name': 'CORP\\a.novak',
    'process.name': 'svchost.exe',
    'destination.ip': '203.0.113.44',
    'event.category': ['network'],
    'event.type': ['start'],
    'kibana.alert.workflow_status': 'open',
  },
  {
    '@timestamp': minutesAgo(150),
    'kibana.alert.rule.name': 'DNS Beaconing Pattern',
    'kibana.alert.severity': 'high',
    'kibana.alert.risk_score': 69,
    'kibana.alert.reason': 'regular-interval DNS queries to newly registered domain',
    'host.name': 'srv-win-defend-01',
    'process.name': 'svchost.exe',
    'dns.question.name': 'cdn-update-metrics.net',
    'event.category': ['network'],
    'event.type': ['start'],
    'kibana.alert.workflow_status': 'open',
  },
];

const sysmonEvents: Array<Record<string, unknown>> = [
  {
    '@timestamp': minutesAgo(5),
    'event.code': 1,
    'event.category': ['process'],
    'event.action': 'Process Create (rule: ProcessCreate)',
    host: { name: 'srv-win-finance-02', os: { family: 'windows' } },
    user: { name: 'CORP\\j.ramirez' },
    process: {
      name: 'rundll32.exe',
      command_line: 'rundll32.exe C:\\windows\\system32\\comsvcs.dll, MiniDump 672 lsass.dmp full',
      entity_id: '{42a1c9e8-0000-0000-9e2b-3f4d5a6b7c8d}',
      parent: { name: 'cmd.exe' },
    },
  },
  {
    '@timestamp': minutesAgo(6),
    'event.code': 10,
    'event.category': ['process'],
    'event.action': 'ProcessAccess (rule: ProcessAccess)',
    host: { name: 'srv-win-finance-02', os: { family: 'windows' } },
    user: { name: 'CORP\\j.ramirez' },
    process: { name: 'rundll32.exe', entity_id: '{42a1c9e8-0000-0000-9e2b-3f4d5a6b7c8d}' },
    winlog: {
      event_data: { TargetImage: 'C:\\Windows\\system32\\lsass.exe', GrantedAccess: '0x1410' },
    },
  },
  {
    '@timestamp': minutesAgo(30),
    'event.code': 3,
    'event.category': ['network'],
    'event.action': 'Network connection detected (rule: NetworkConnect)',
    host: { name: 'wkstn-win-hr-14', os: { family: 'windows' } },
    user: { name: 'CORP\\a.novak' },
    process: { name: 'powershell.exe' },
    source: { ip: '10.20.4.14', port: 49712 },
    destination: { ip: '203.0.113.44', port: 443, domain: 'cdn-update-metrics.net' },
    network: { protocol: 'https', direction: 'outbound' },
  },
  {
    '@timestamp': minutesAgo(47),
    'event.code': 11,
    'event.category': ['file'],
    'event.action': 'File created (rule: FileCreate)',
    host: { name: 'wkstn-win-hr-14', os: { family: 'windows' } },
    user: { name: 'CORP\\a.novak' },
    process: { name: 'powershell.exe' },
    file: {
      path: 'C:\\Users\\a.novak\\AppData\\Local\\Temp\\upd_cache.bin',
      hash: { sha256: '9b7d3a2c1e0f48619c2bd7e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5' },
    },
  },
  {
    '@timestamp': minutesAgo(92),
    'event.code': 3,
    'event.category': ['network'],
    'event.action': 'Network connection detected (rule: NetworkConnect)',
    host: { name: 'srv-win-defend-01', os: { family: 'windows' } },
    user: { name: 'SYSTEM' },
    process: { name: 'BluetoothService.exe' },
    source: { ip: '10.10.1.31', port: 51344 },
    destination: { ip: '198.51.100.7', port: 8443 },
    network: { protocol: 'tcp', direction: 'outbound' },
  },
];

const entityRiskDocs: Array<Record<string, unknown>> = [
  {
    '@timestamp': minutesAgo(3),
    'entity.kind': 'user',
    'entity.name': 'j.ramirez',
    'risk_score.level': 'critical',
    'risk_score.calculated_level': 'critical',
    'risk_score.calculated_score_norm': 94,
    'risk_score.notes': 'LSASS dump + encoded PowerShell on finance server',
    'user.name': 'CORP\\j.ramirez',
  },
  {
    '@timestamp': minutesAgo(3),
    'entity.kind': 'user',
    'entity.name': 'a.novak',
    'risk_score.level': 'moderate',
    'risk_score.calculated_level': 'moderate',
    'risk_score.calculated_score_norm': 48,
    'risk_score.notes': 'encoded PowerShell + outbound SMB beaconing',
    'user.name': 'CORP\\a.novak',
  },
  {
    '@timestamp': minutesAgo(3),
    'entity.kind': 'host',
    'entity.name': 'srv-win-finance-02',
    'risk_score.level': 'high',
    'risk_score.calculated_level': 'high',
    'risk_score.calculated_score_norm': 81,
    'risk_score.notes': 'credential dumping alert cluster',
    'host.name': 'srv-win-finance-02',
  },
];

const securityLabsDocs: Array<Record<string, unknown>> = [
  {
    '@timestamp': minutesAgo(60 * 24 * 5),
    'content.title': 'LSASS Memory Dumping via comsvcs.dll',
    'content.type': 'detection-guide',
    'content.url': 'https://www.elastic.co/security-labs/lsass-dumping-via-comsvcs',
    'content.summary':
      'Detect LSASS credential dumping using comsvcs.dll MiniDump; hunt via Sysmon Event ID 10 ProcessAccess with TargetImage lsass.exe and GrantedAccess 0x1410.',
    'content.tags': ['credential-access', 'windows', 'sysmon'],
  },
  {
    '@timestamp': minutesAgo(60 * 24 * 3),
    'content.title': 'Hunting Encoded PowerShell Download Cradles',
    'content.type': 'detection-guide',
    'content.url': 'https://www.elastic.co/security-labs/hunting-embedded-payloads',
    'content.summary':
      'Encoded PowerShell -enc cradles with download strings; hunt via Sysmon Event ID 1 plus outbound 443 to newly registered domains.',
    'content.tags': ['execution', 'powershell', 'defense-evasion'],
  },
];

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
    const docs: AlertDoc[] =
      seedProfile === 'enriched'
        ? enrichedAlerts
        : Array.from({ length: count }).map((_, i) => ({
            ...baseAlert,
            '@timestamp': new Date(Date.now() - i * 60000).toISOString(),
            'kibana.alert.risk_score': Math.max(30, 73 - i * 10),
          }));

    await esClient.bulk({
      index: ALERT_INDEX,
      refresh: 'wait_for',
      operations: docs.flatMap((doc) => [{ create: {} }, doc]),
    });
    log.info(
      `Seeded ${docs.length} Chrysalis alerts into ${ALERT_INDEX} (profile: ${seedProfile})`
    );

    if (seedProfile === 'enriched') {
      await seedEnrichedSources(esClient, log);
    }
  } catch (err) {
    log.warning(`Failed to seed alerts: ${err}`);
    throw err;
  }
}

async function seedEnrichedSources(esClient: EsClient, log: ToolingLog): Promise<void> {
  const groups: Array<{ index: string; docs: Array<Record<string, unknown>> }> = [
    { index: TELEMETRY_INDEX, docs: sysmonEvents },
    { index: ENTITY_RISK_INDEX, docs: entityRiskDocs },
    { index: SECURITY_LABS_INDEX, docs: securityLabsDocs },
  ];
  for (const { index, docs } of groups) {
    try {
      const exists = await esClient.indices.exists({ index });
      if (!exists) {
        await esClient.indices.create({ index });
      }
      await esClient.bulk({
        index,
        refresh: 'wait_for',
        operations: docs.flatMap((doc) => [{ create: {} }, doc]),
      });
      log.info(`Seeded ${docs.length} docs into ${index}`);
    } catch (err) {
      log.warning(`Failed to seed ${index}: ${err}`);
    }
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
    if (seedProfile === 'enriched') {
      for (const index of [TELEMETRY_INDEX, ENTITY_RISK_INDEX, SECURITY_LABS_INDEX]) {
        try {
          await esClient.indices.delete({ index });
          log.info(`Deleted enriched index ${index}`);
        } catch (err) {
          log.warning(`Cleanup warning for ${index}: ${err}`);
        }
      }
    }
  } catch (err) {
    log.warning(`Cleanup warning: ${err}`);
  }
}
