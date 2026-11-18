/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AuditScenario } from '../types';
import { defineAlerts, type AlertDraft } from '../define_alerts';
import { buildSharedCiEgressDrafts, SHARED_CI_EGRESS_GROUPS } from './shared_ci_egress';

const SCENARIO_ID = 'positive-chain-with-noise';

const HOST = 'WS-FIN-214';
const USER = 'j.meyer';
const POWERSHELL = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const LOADER = 'C:\\ProgramData\\k3x9q2\\svc_helper.exe';

interface ChainStage {
  key: string;
  time: string;
  rule: string;
  severity: 'high' | 'critical';
  riskScore: number;
  tactic: string;
  message: string;
  process: Record<string, string | number>;
  network?: Record<string, string | number>;
}

/**
 * A ClickFix-style chain (obfuscated PowerShell from the Run dialog, AMSI bypass, dropped
 * loader, HTTPS command and control), authored as detection alerts. Addresses come from the
 * RFC 5737 documentation ranges and the loader name is invented, so nothing here identifies a
 * real campaign or infrastructure.
 */
const STAGES: readonly ChainStage[] = [
  {
    key: 'clickfix',
    time: '2026-03-14T10:00:05.000Z',
    rule: 'Obfuscated PowerShell Started from the Run Dialog',
    severity: 'high',
    riskScore: 73,
    tactic: 'Execution',
    message: 'powershell.exe ran an obfuscated one-liner from the Run dialog and fetched a script',
    process: {
      'process.name': 'powershell.exe',
      'process.pid': 4812,
      'process.executable': POWERSHELL,
      'process.command_line':
        "powershell.exe -WInDo Min $a1='QkJCQkJCQkJCQkJCQmNkbi5leGFtcGxl';$b2=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($a1)).Substring(13)",
      'process.parent.name': 'explorer.exe',
    },
    network: { 'destination.ip': '192.0.2.44' },
  },
  {
    key: 'amsi',
    time: '2026-03-14T10:02:05.000Z',
    rule: 'AMSI Bypass via PowerShell Reflection',
    severity: 'high',
    riskScore: 79,
    tactic: 'Defense Evasion',
    message: 'powershell.exe set AmsiUtils.amsiInitFailed through reflection',
    process: {
      'process.name': 'powershell.exe',
      'process.pid': 4812,
      'process.executable': POWERSHELL,
      'process.command_line':
        "[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils').GetField('amsiInitFailed','NonPublic,Static').SetValue($null,$true)",
      'process.parent.name': 'explorer.exe',
    },
  },
  {
    key: 'loader',
    time: '2026-03-14T10:03:05.000Z',
    rule: 'Executable Written to ProgramData and Started by PowerShell',
    severity: 'high',
    riskScore: 73,
    tactic: 'Execution',
    message:
      'powershell.exe wrote svc_helper.exe to a randomly named ProgramData folder and started it',
    process: {
      'process.name': 'svc_helper.exe',
      'process.pid': 5220,
      'process.executable': LOADER,
      'process.parent.name': 'powershell.exe',
      'file.path': LOADER,
    },
  },
  {
    key: 'c2',
    time: '2026-03-14T10:05:00.000Z',
    rule: 'Periodic HTTPS Connections from a Newly Written Binary',
    severity: 'critical',
    riskScore: 91,
    tactic: 'Command and Control',
    message: 'svc_helper.exe made repeated HTTPS requests to an external host',
    process: {
      'process.name': 'svc_helper.exe',
      'process.pid': 5220,
      'process.executable': LOADER,
      'process.parent.name': 'powershell.exe',
    },
    network: { 'destination.ip': '198.51.100.23', 'network.protocol': 'https' },
  },
];

const chainDrafts: AlertDraft[] = STAGES.map(
  ({ key, time, rule, severity, riskScore, tactic, message, process, network }) => ({
    key: `chain-${key}`,
    group: 'clickfix-chain',
    fields: {
      '@timestamp': time,
      'kibana.alert.rule.name': rule,
      'kibana.alert.rule.description': `${rule}.`,
      'kibana.alert.severity': severity,
      'kibana.alert.risk_score': riskScore,
      'kibana.alert.rule.threat.tactic.name': tactic,
      'event.category': 'process',
      'host.name': HOST,
      'host.os.name': 'Windows',
      'user.name': USER,
      'user.domain': 'CORP',
      message,
      ...process,
      ...network,
    },
  })
);

const noiseDrafts = buildSharedCiEgressDrafts().map((draft) => ({
  ...draft,
  key: `noise-${draft.key}`,
}));

const { alerts, alertGroups } = defineAlerts(SCENARIO_ID, [...chainDrafts, ...noiseDrafts]);

/**
 * Positive control. A four-stage chain on one workstation, mixed with the shared-egress cloud
 * noise. A model that is merely quiet scores well on the other scenarios; this one only scores
 * when it still finds the chain without joining the noise to it.
 *
 * The `enriched_context` operator context states environment facts only; it says nothing about
 * the chain, which is the same in every variant.
 */
export const positiveChainWithNoiseScenario: AuditScenario = {
  id: SCENARIO_ID,
  description:
    'Positive control: a ClickFix-style endpoint chain mixed with unrelated shared-egress cloud alerts.',
  provenance: 'authored',
  alerts,
  operatorContext:
    'Finance workstations are standard-image Windows laptops; engineering uses several AWS accounts behind a shared egress NAT gateway.',
  gold: {
    alertGroups,
    // Pairs the chain with each noise group only; noise-to-noise joins are scored by shared-ci-egress.
    forbiddenCoCitation: SHARED_CI_EGRESS_GROUPS.map((group) => ['clickfix-chain', group] as const),
    expectedDiscoveries: 'atLeastOne',
    requiredGroup: 'clickfix-chain',
    confirmedGroups: ['clickfix-chain'],
  },
};
