/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AuditScenario } from '../types';
import { defineAlerts, type AlertDraft } from '../define_alerts';

const SCENARIO_ID = 'benign-batch';

const HOSTS = ['WS-HR-101', 'WS-HR-102', 'WS-ENG-201', 'WS-ENG-202', 'WS-FIN-301', 'SRV-PRINT-01'];

interface Signature {
  subjectName: string;
  signingId: string;
}

interface BenignPattern {
  rule: string;
  tactic: string;
  processName: string;
  executable: string;
  commandLine: string;
  workingDirectory: string;
  message: string;
  signature: Signature;
  parentName: string;
  parentExecutable: string;
  parentSignature: Signature;
}

const MICROSOFT_WINDOWS: Signature = {
  subjectName: 'Microsoft Windows',
  signingId: 'Microsoft.Windows',
};
const MICROSOFT_CORPORATION: Signature = {
  subjectName: 'Microsoft Corporation',
  signingId: 'Microsoft.Corporation',
};

/**
 * Every pattern runs as the SYSTEM account, is vendor-signed, runs from the vendor's install path under a known parent, and
 * has a neutral rule name. The alert data alone gives no reason to suspect any of them: nothing
 * is unsigned, nothing runs from a user-writable or temporary path, and no rule name names an
 * attack technique.
 *
 * The earlier draft used "Credential Dumping Tool Name Match in Backup Agent" and "Remote
 * Management Tool Connection". Both read as attack indicators, which made a discovery
 * defensible, so they were reworked into neutral signed-vendor rules here rather than kept
 * under a negative-control label.
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
    signature: MICROSOFT_CORPORATION,
    parentName: 'services.exe',
    parentExecutable: 'C:\\Windows\\System32\\services.exe',
    parentSignature: MICROSOFT_WINDOWS,
  },
  {
    rule: 'PowerShell Script from Software Distribution Share',
    tactic: 'Execution',
    processName: 'powershell.exe',
    executable: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    commandLine: 'powershell.exe -File \\\\fileshare\\deploy\\inventory.ps1',
    workingDirectory: 'C:\\Windows\\CCM\\SystemTemp\\',
    message: 'PowerShell ran the weekly inventory script from the software distribution share',
    signature: MICROSOFT_WINDOWS,
    parentName: 'CcmExec.exe',
    parentExecutable: 'C:\\Windows\\CCM\\CcmExec.exe',
    parentSignature: MICROSOFT_CORPORATION,
  },
  {
    rule: 'Browser Update Service Ran a Scheduled Update',
    tactic: 'Defense Evasion',
    processName: 'GoogleUpdate.exe',
    executable: 'C:\\Program Files (x86)\\Google\\Update\\GoogleUpdate.exe',
    commandLine: 'GoogleUpdate.exe /ua /installsource scheduler',
    workingDirectory: 'C:\\Program Files (x86)\\Google\\Update\\',
    message: 'The browser updater ran its scheduled update check',
    signature: { subjectName: 'Google LLC', signingId: 'GoogleUpdate.exe' },
    parentName: 'svchost.exe',
    parentExecutable: 'C:\\Windows\\System32\\svchost.exe',
    parentSignature: MICROSOFT_WINDOWS,
  },
  {
    rule: 'Remote Support Service Started a Session',
    tactic: 'Command and Control',
    processName: 'TeamViewer_Service.exe',
    executable: 'C:\\Program Files\\TeamViewer\\TeamViewer_Service.exe',
    commandLine: 'TeamViewer_Service.exe',
    workingDirectory: 'C:\\Program Files\\TeamViewer\\',
    message: 'The IT-approved remote support service started a helpdesk session',
    signature: { subjectName: 'TeamViewer GmbH', signingId: 'TeamViewer_Service.exe' },
    parentName: 'services.exe',
    parentExecutable: 'C:\\Windows\\System32\\services.exe',
    parentSignature: MICROSOFT_WINDOWS,
  },
  {
    rule: 'Backup Agent Created a Volume Snapshot',
    tactic: 'Collection',
    processName: 'backup_agent.exe',
    executable: 'C:\\Program Files\\BackupAgent\\backup_agent.exe',
    commandLine: 'backup_agent.exe --snapshot --volume C:',
    workingDirectory: 'C:\\Program Files\\BackupAgent\\',
    message: 'The backup agent created its scheduled volume snapshot',
    signature: { subjectName: 'Example Backup Software Inc.', signingId: 'backup_agent.exe' },
    parentName: 'services.exe',
    parentExecutable: 'C:\\Windows\\System32\\services.exe',
    parentSignature: MICROSOFT_WINDOWS,
  },
];

const signatureFields = (
  prefix: string,
  { subjectName, signingId }: Signature,
  withId: boolean
) => ({
  [`${prefix}.exists`]: 'true',
  ...(withId ? { [`${prefix}.signing_id`]: signingId } : {}),
  [`${prefix}.status`]: 'trusted',
  [`${prefix}.subject_name`]: subjectName,
  [`${prefix}.trusted`]: 'true',
});

const COUNT = 36;

const drafts: AlertDraft[] = Array.from({ length: COUNT }, (_, index) => {
  const pattern = PATTERNS[index % PATTERNS.length];
  const host = HOSTS[(index * 5) % HOSTS.length];
  const minute = String((index * 13) % 60).padStart(2, '0');
  const hour = String(8 + (index % 9)).padStart(2, '0');
  return {
    key: `benign-${index}`,
    group: 'benign-batch',
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
      ...signatureFields('process.code_signature', pattern.signature, true),
      ...signatureFields('process.parent.code_signature', pattern.parentSignature, false),
      message: pattern.message,
    },
  };
});

const { alerts, alertGroups } = defineAlerts(SCENARIO_ID, drafts);

/**
 * Negative control: 36 alerts from vendor-signed management, update, remote-support and backup
 * software, run from their install paths under service parents, spread over six hosts. Nothing
 * in the alert data is anomalous, so reporting any discovery is a false positive.
 */
export const benignBatchScenario: AuditScenario = {
  id: SCENARIO_ID,
  description:
    'Negative control: a batch of 36 alerts from vendor-signed enterprise tooling running from known paths, with no attack.',
  provenance: 'authored',
  alerts,
  operatorContext:
    'Endpoint management, patching and remote-support agents are deployed on all managed servers in this environment.',
  gold: {
    alertGroups,
    forbiddenCoCitation: [],
    expectedDiscoveries: 'none',
    confirmedGroups: [],
  },
};
