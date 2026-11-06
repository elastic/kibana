/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { AuditScenario } from '../types';
import { defineAlerts, type AlertDraft } from '../define_alerts';

export const SEEDED_FALSE_POSITIVE_SCENARIO_ID = 'seeded-false-positive';

const SCENARIO_ID = SEEDED_FALSE_POSITIVE_SCENARIO_ID;

const HOSTS = ['WS-MGMT-201', 'WS-MGMT-202'];

const MICROSOFT_WINDOWS = { subjectName: 'Microsoft Windows', signingId: 'Microsoft.Windows' };
const MICROSOFT_CORPORATION = {
  subjectName: 'Microsoft Corporation',
  signingId: 'Microsoft.Corporation',
};

interface BenignPattern {
  rule: string;
  tactic: string;
  processName: string;
  executable: string;
  commandLine: string;
  workingDirectory: string;
  message: string;
  parentName: string;
  parentExecutable: string;
}

/**
 * Routine SCCM activity: SYSTEM, vendor-signed, from its install path under a service parent. The
 * world (`worker_world.ts`) shows the same hosts as `CcmExec.exe` under `services.exe` with one
 * internal management destination, so every world check, the network one included, contradicts the
 * seeded discovery's command-and-control story.
 */
const PATTERNS: readonly BenignPattern[] = [
  {
    rule: 'Scheduled Task Created by Management Agent',
    tactic: 'Persistence',
    processName: 'CcmExec.exe',
    executable: 'C:\\Windows\\CCM\\CcmExec.exe',
    commandLine: 'CcmExec.exe /runservice',
    workingDirectory: 'C:\\Windows\\CCM\\',
    message: 'The endpoint management agent registered a maintenance task',
    parentName: 'services.exe',
    parentExecutable: 'C:\\Windows\\System32\\services.exe',
  },
  {
    rule: 'PowerShell Script from Software Distribution Share',
    tactic: 'Execution',
    processName: 'powershell.exe',
    executable: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    commandLine: 'powershell.exe -File \\\\fileshare\\deploy\\inventory.ps1',
    workingDirectory: 'C:\\Windows\\CCM\\SystemTemp\\',
    message: 'PowerShell ran the weekly inventory script from the software distribution share',
    parentName: 'CcmExec.exe',
    parentExecutable: 'C:\\Windows\\CCM\\CcmExec.exe',
  },
  {
    rule: 'Software Inventory Reported by Management Agent',
    tactic: 'Discovery',
    processName: 'ccm_sitetoken.exe',
    executable: 'C:\\Windows\\CCM\\ccm_sitetoken.exe',
    commandLine: 'ccm_sitetoken.exe /inventory /report',
    workingDirectory: 'C:\\Windows\\CCM\\',
    message: 'The management agent reported its scheduled software inventory',
    parentName: 'CcmExec.exe',
    parentExecutable: 'C:\\Windows\\CCM\\CcmExec.exe',
  },
];

const signatureFields = (prefix: string, signature: typeof MICROSOFT_WINDOWS, withId: boolean) => ({
  [`${prefix}.exists`]: 'true',
  ...(withId ? { [`${prefix}.signing_id`]: signature.signingId } : {}),
  [`${prefix}.status`]: 'trusted',
  [`${prefix}.subject_name`]: signature.subjectName,
  [`${prefix}.trusted`]: 'true',
});

const COUNT = 18;

const drafts: AlertDraft[] = Array.from({ length: COUNT }, (_, index) => {
  const pattern = PATTERNS[index % PATTERNS.length];
  const host = HOSTS[(index * 7) % HOSTS.length];
  const minute = String((index * 17) % 60).padStart(2, '0');
  const hour = String(9 + (index % 6)).padStart(2, '0');
  return {
    key: `sccm-${index}`,
    group: 'benign-sccm',
    fields: {
      '@timestamp': `2026-03-13T${hour}:${minute}:00.000Z`,
      'kibana.alert.rule.name': pattern.rule,
      'kibana.alert.rule.description': `${pattern.rule}.`,
      'kibana.alert.severity': index % 6 === 0 ? 'medium' : 'low',
      'kibana.alert.risk_score': index % 6 === 0 ? 47 : 21,
      'kibana.alert.rule.threat.tactic.name': pattern.tactic,
      'event.category': 'process',
      'host.name': host,
      'user.name': 'SYSTEM',
      'user.id': 'S-1-5-18',
      'process.name': pattern.processName,
      'process.executable': pattern.executable,
      'process.command_line': pattern.commandLine,
      'process.working_directory': pattern.workingDirectory,
      'process.parent.name': pattern.parentName,
      'process.parent.executable': pattern.parentExecutable,
      ...signatureFields('process.code_signature', MICROSOFT_CORPORATION, true),
      ...signatureFields('process.parent.code_signature', MICROSOFT_WINDOWS, false),
      message: pattern.message,
    },
  };
});

const { alerts, alertGroups } = defineAlerts(SCENARIO_ID, drafts);

/**
 * The attack id is 64 hex characters, so the Investigation id the review derives from it (the
 * `<a[0:8]>-<a[8:12]>-8<a[12:15]>-8<a[15:18]>-<a[18:30]>` slice, `investigationIdFor`) always
 * yields a valid UUIDv8.
 */
export const seededFalsePositiveAttackId = (runMarker: string): string =>
  createHash('sha256').update(`${SCENARIO_ID}:${runMarker}:attack-discovery`).digest('hex');

export const SEEDED_FALSE_POSITIVE_TITLE = 'Encoded PowerShell command-and-control on WS-MGMT-201';

/**
 * The authored false-positive Attack Discovery, seeded into the space's discovery index. It claims
 * an encoded PowerShell C2 chain over seeded benign alerts while the world shows routine SCCM
 * activity, so the expected verdict is `false_positive`. The runner never reviews it, so the row
 * dispatches the review itself.
 */
export const buildSeededFalsePositiveDiscovery = ({
  runMarker,
  spaceId,
  seededAlertIds,
  timestampMs,
}: {
  runMarker: string;
  spaceId: string;
  /** Seeded `_id`s (`${runMarker}-${alert.id}`) of the benign alerts the discovery cites. */
  seededAlertIds: readonly string[];
  timestampMs: number;
}): { id: string; doc: Record<string, unknown> } => {
  const id = seededFalsePositiveAttackId(runMarker);
  const cited = seededAlertIds.slice(0, 4);
  const doc: Record<string, unknown> = {
    '@timestamp': new Date(timestampMs).toISOString(),
    'event.kind': 'signal',
    'event.category': ['intrusion_detection'],
    tags: [runMarker],
    'labels.ad_portable_seed': runMarker,
    message: SEEDED_FALSE_POSITIVE_TITLE,
    'kibana.alert.uuid': id,
    'kibana.alert.rule.name': 'Attack Discovery',
    'kibana.alert.rule.rule_type_id': 'attack-discovery',
    'kibana.alert.severity': 'high',
    'kibana.alert.risk_score': 73,
    'kibana.alert.status': 'active',
    'kibana.alert.workflow_status': 'open',
    'kibana.space_ids': [spaceId],
    'kibana.alert.attack_discovery.alert_ids': cited,
    'kibana.alert.attack_discovery.title': SEEDED_FALSE_POSITIVE_TITLE,
    'kibana.alert.attack_discovery.summary_markdown':
      'Hidden encoded PowerShell was observed on WS-MGMT-201, reaching an external command-and-control endpoint while masquerading as the endpoint management agent.',
    'kibana.alert.attack_discovery.details_markdown':
      'On WS-MGMT-201, powershell.exe ran with an encoded command under the management agent and established repeated connections to an external host. The pattern is consistent with a PowerShell download cradle and command-and-control beaconing.',
    'kibana.alert.attack_discovery.mitre_attack_tactics': ['Execution', 'Command and Control'],
    // Fields the review's attachment resolver requires (`getMissingFields` skips a document without
    // them, and the review fails with "not found, or is not readable"). The api_config is an object
    // because the persisted documents carry it that way. The ids are placeholders no generation run
    // shares, so the row's generation-model and persisted-count checks skip this one.
    'kibana.alert.attack_discovery.api_config': {
      action_type_id: '.inference',
      connector_id: 'ad-worker-eval-seed',
      name: 'ad-worker-eval-seed',
    },
    'kibana.alert.rule.execution.uuid': `${runMarker}-seeded-execution`,
  };
  return { id, doc };
};

/**
 * Negative control: 18 routine SCCM alerts plus an authored Attack Discovery claiming an attack
 * over them. Generation must still report nothing; the review, dispatched directly at the seeded
 * discovery, must clear it as a false positive.
 */
export const seededFalsePositiveScenario: AuditScenario = {
  id: SCENARIO_ID,
  description:
    'Negative control with a seeded false-positive Attack Discovery: benign SCCM alerts the world confirms as routine management activity.',
  provenance: 'authored',
  alerts,
  operatorContext:
    'SCCM endpoint management, including its PowerShell inventory scripts, is deployed on all managed workstations in this environment.',
  gold: {
    alertGroups,
    forbiddenCoCitation: [],
    expectedDiscoveries: 'none',
    confirmedGroups: [],
  },
};
