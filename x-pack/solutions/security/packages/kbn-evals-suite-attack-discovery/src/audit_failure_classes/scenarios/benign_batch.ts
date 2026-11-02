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

const USERS = ['a.kowalski', 'b.nowak', 'c.wisniewski', 'd.wojcik', 'e.kaminski', 'f.lewandowski'];

interface BenignPattern {
  rule: string;
  tactic: string;
  processName: string;
  executable: string;
  commandLine: string;
  message: string;
}

const PATTERNS: readonly BenignPattern[] = [
  {
    rule: 'Scheduled Task Created by Management Agent',
    tactic: 'Persistence',
    processName: 'CcmExec.exe',
    executable: 'C:\\Windows\\CCM\\CcmExec.exe',
    commandLine: 'CcmExec.exe /runservice',
    message: 'The endpoint management agent registered a maintenance task',
  },
  {
    rule: 'PowerShell Script from Software Distribution Share',
    tactic: 'Execution',
    processName: 'powershell.exe',
    executable: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    commandLine: 'powershell.exe -File \\\\fileshare\\deploy\\inventory.ps1',
    message: 'PowerShell ran the weekly inventory script from the software distribution share',
  },
  {
    rule: 'Unsigned DLL Loaded by Browser Update Service',
    tactic: 'Defense Evasion',
    processName: 'GoogleUpdate.exe',
    executable: 'C:\\Program Files (x86)\\Google\\Update\\GoogleUpdate.exe',
    commandLine: 'GoogleUpdate.exe /ua /installsource scheduler',
    message: 'The browser updater loaded a helper library during a scheduled update',
  },
  {
    rule: 'Remote Management Tool Connection',
    tactic: 'Command and Control',
    processName: 'TeamViewer_Service.exe',
    executable: 'C:\\Program Files\\TeamViewer\\TeamViewer_Service.exe',
    commandLine: 'TeamViewer_Service.exe',
    message: 'The IT-approved remote support service opened a session',
  },
  {
    rule: 'Credential Dumping Tool Name Match in Backup Agent',
    tactic: 'Credential Access',
    processName: 'backup_agent.exe',
    executable: 'C:\\Program Files\\BackupAgent\\backup_agent.exe',
    commandLine: 'backup_agent.exe --snapshot --volume C:',
    message: 'The backup agent matched a name heuristic while creating a volume snapshot',
  },
];

const COUNT = 36;

const drafts: AlertDraft[] = Array.from({ length: COUNT }, (_, index) => {
  const pattern = PATTERNS[index % PATTERNS.length];
  const host = HOSTS[(index * 5) % HOSTS.length];
  const user = USERS[(index * 7 + 2) % USERS.length];
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
      'user.name': user,
      'user.id': `S-1-5-21-1004336348-1177238915-682003330-${
        1100 + ((index * 7 + 2) % USERS.length)
      }`,
      'process.name': pattern.processName,
      'process.executable': pattern.executable,
      'process.command_line': pattern.commandLine,
      message: pattern.message,
    },
  };
});

const { alerts, alertGroups } = defineAlerts(SCENARIO_ID, drafts);

/**
 * Negative control: 36 routine management, update and backup alerts spread over six hosts and
 * six users with no attack behaviour. Reporting any discovery is a false positive.
 */
export const benignBatchScenario: AuditScenario = {
  id: SCENARIO_ID,
  description:
    'Negative control: a batch of 36 routine enterprise-tooling alerts that contain no attack.',
  provenance: 'authored',
  alerts,
  gold: {
    alertGroups,
    forbiddenCoCitation: [],
    expectedDiscoveries: 'none',
    confirmed: false,
  },
};
