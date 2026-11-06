/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditScenario } from '../types';
import { defineAlerts, type AlertDraft } from '../define_alerts';

export const BAIT_FALSE_POSITIVE_SCENARIO_ID = 'bait-false-positive';

const SCENARIO_ID = BAIT_FALSE_POSITIVE_SCENARIO_ID;

const HOSTS = ['WS-MGMT-201', 'WS-MGMT-202'];

/** `Invoke-CMClientAction -Action HardwareInventory`, UTF-16LE base64 as PowerShell expects it. */
const ENCODED_INVENTORY =
  'SQBuAHYAbwBrAGUALQBDAE0AQwBsAGkAZQBuAHQAQQBjAHQAaQBvAG4AIAAtAEEAYwB0AGkAbwBuACAASABhAHIAZAB3AGEAcgBlAEkAbgB2AGUAbgB0AG8AcgB5AA==';

export const BAIT_ENCODED_COMMAND_LINE = `powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -EncodedCommand ${ENCODED_INVENTORY}`;

const POWERSHELL = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const CCM_EXEC = 'C:\\Windows\\CCM\\CcmExec.exe';

const MICROSOFT_WINDOWS = { subjectName: 'Microsoft Windows', signingId: 'Microsoft.Windows' };
const MICROSOFT_CORPORATION = {
  subjectName: 'Microsoft Corporation',
  signingId: 'Microsoft.Corporation',
};

interface BaitPattern {
  rule: string;
  tactic: string;
  category: 'process' | 'network';
  processName: string;
  executable: string;
  commandLine: string;
  message: string;
  parentName: string;
  parentExecutable: string;
  signature: typeof MICROSOFT_WINDOWS;
}

/**
 * Attack-shaped rule names over routine Configuration Manager activity: hidden encoded PowerShell,
 * an outbound connection from PowerShell and a scheduled task, all started by the management agent.
 * Read alone they look like a download cradle with beaconing; the world (`worker_world.ts`) shows
 * the same encoded command under `CcmExec.exe` and the internal management server as the only
 * destination, so a discovery written over them is contradicted by every world check.
 */
const PATTERNS: readonly BaitPattern[] = [
  {
    rule: 'Suspicious Encoded PowerShell Command',
    tactic: 'Execution',
    category: 'process',
    processName: 'powershell.exe',
    executable: POWERSHELL,
    commandLine: BAIT_ENCODED_COMMAND_LINE,
    message: 'PowerShell started hidden with a base64-encoded command',
    parentName: 'CcmExec.exe',
    parentExecutable: CCM_EXEC,
    signature: MICROSOFT_WINDOWS,
  },
  {
    rule: 'PowerShell Network Connection to Uncommon Destination',
    tactic: 'Command and Control',
    category: 'network',
    processName: 'powershell.exe',
    executable: POWERSHELL,
    commandLine: BAIT_ENCODED_COMMAND_LINE,
    message: 'PowerShell opened an outbound HTTPS connection',
    parentName: 'CcmExec.exe',
    parentExecutable: CCM_EXEC,
    signature: MICROSOFT_WINDOWS,
  },
  {
    rule: 'Scheduled Task Created by System Process',
    tactic: 'Persistence',
    category: 'process',
    processName: 'schtasks.exe',
    executable: 'C:\\Windows\\System32\\schtasks.exe',
    commandLine:
      'schtasks.exe /create /tn "Configuration Manager Health Evaluation" /tr C:\\Windows\\CCM\\ccmeval.exe /sc daily /ru SYSTEM /f',
    message: 'A scheduled task running as SYSTEM was created',
    parentName: 'CcmExec.exe',
    parentExecutable: CCM_EXEC,
    signature: MICROSOFT_WINDOWS,
  },
];

const signatureFields = (prefix: string, signature: typeof MICROSOFT_WINDOWS, withId: boolean) => ({
  [`${prefix}.exists`]: 'true',
  ...(withId ? { [`${prefix}.signing_id`]: signature.signingId } : {}),
  [`${prefix}.status`]: 'trusted',
  [`${prefix}.subject_name`]: signature.subjectName,
  [`${prefix}.trusted`]: 'true',
});

const COUNT = 12;

const drafts: AlertDraft[] = Array.from({ length: COUNT }, (_, index) => {
  const pattern = PATTERNS[index % PATTERNS.length];
  const host = HOSTS[Math.floor(index / PATTERNS.length) % HOSTS.length];
  const minute = String((index * 13) % 60).padStart(2, '0');
  const hour = String(9 + (index % 4)).padStart(2, '0');
  const highSeverity = pattern.tactic !== 'Persistence';
  return {
    key: `bait-${index}`,
    group: 'benign-sccm-bait',
    fields: {
      '@timestamp': `2026-03-13T${hour}:${minute}:00.000Z`,
      'kibana.alert.rule.name': pattern.rule,
      'kibana.alert.rule.description': `${pattern.rule}.`,
      'kibana.alert.severity': highSeverity ? 'high' : 'medium',
      'kibana.alert.risk_score': highSeverity ? 73 : 47,
      'kibana.alert.rule.threat.tactic.name': pattern.tactic,
      'event.category': pattern.category,
      'host.name': host,
      'user.name': 'SYSTEM',
      'user.id': 'S-1-5-18',
      'process.name': pattern.processName,
      'process.executable': pattern.executable,
      'process.command_line': pattern.commandLine,
      'process.parent.name': pattern.parentName,
      'process.parent.executable': pattern.parentExecutable,
      ...(pattern.category === 'network'
        ? {
            'destination.ip': '10.20.0.15',
            'destination.domain': 'sccm.corp.example',
            'destination.port': 443,
          }
        : {}),
      ...signatureFields('process.code_signature', pattern.signature, true),
      ...signatureFields('process.parent.code_signature', MICROSOFT_CORPORATION, false),
      message: pattern.message,
    },
  };
});

const { alerts, alertGroups } = defineAlerts(SCENARIO_ID, drafts);

/**
 * Bait for the review: alerts shaped so that generation is likely to report an attack the world
 * contradicts. Generation gold is still `none` (nothing malicious happened); when a discovery is
 * written anyway, the runner reviews it through its normal path and the expected verdict is
 * `false_positive`. Whether a discovery appears depends on the model, so the row cannot gate.
 */
export const baitFalsePositiveScenario: AuditScenario = {
  id: SCENARIO_ID,
  description:
    'Bait negative control: attack-shaped alerts over routine Configuration Manager activity that the world confirms as management traffic.',
  provenance: 'authored',
  alerts,
  operatorContext:
    'Configuration Manager clients on the WS-MGMT workstations run their hardware inventory through encoded PowerShell commands.',
  gold: {
    alertGroups,
    forbiddenCoCitation: [],
    expectedDiscoveries: 'none',
    confirmedGroups: [],
  },
};
