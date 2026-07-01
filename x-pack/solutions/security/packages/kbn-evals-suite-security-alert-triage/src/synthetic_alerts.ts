/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Synthetic alert documents for triage quality evals.
 *
 * Two groups of 100 alerts each (5 batches of 20 → inline mode):
 *
 *   PRIORITY_TRIAGE (100 alerts)
 *     - 1 critical at index 49 (buried mid-list)
 *     - 10 high (indices 0–9)
 *     - 30 medium (indices 10–39)
 *     - 59 low (indices 40–99 excluding 49)
 *     Tests whether the LLM finds the critical needle and prioritises correctly.
 *
 *   ENTITY_CORRELATION (100 alerts, 17 hosts)
 *     - 20 alerts on web-server-01 (showing an attack progression)
 *     - 80 alerts spread 5-per-host across 16 other hosts
 *     Tests whether the LLM identifies the most targeted host.
 *
 * Fields are a subset of ESSENTIAL_ALERT_FIELDS (common/constants.ts:585) — the
 * same fields the attachment agent description instructs the LLM to extract.
 */

interface SyntheticAlert {
  id: string;
  doc: Record<string, unknown>;
}

const ts = (offsetMinutes: number): string => {
  const d = new Date('2024-06-15T09:00:00Z');
  d.setMinutes(d.getMinutes() + offsetMinutes);
  return d.toISOString();
};

// ── Lookup tables ─────────────────────────────────────────────────────────────

const RULES_BY_SEVERITY: Record<
  string,
  Array<{ rule: string; tactic: string; technique: string }>
> = {
  critical: [
    {
      rule: 'Suspicious PowerShell with Encoded Commands',
      tactic: 'Execution',
      technique: 'PowerShell',
    },
    {
      rule: 'Memory Injection via Process Hollowing',
      tactic: 'Defense Evasion',
      technique: 'Process Injection',
    },
    {
      rule: 'Ransomware File Encryption Activity',
      tactic: 'Impact',
      technique: 'Data Encrypted for Impact',
    },
  ],
  high: [
    {
      rule: 'Credential Dumping via LSASS Access',
      tactic: 'Credential Access',
      technique: 'OS Credential Dumping',
    },
    {
      rule: 'Lateral Movement via Admin Share',
      tactic: 'Lateral Movement',
      technique: 'SMB/Windows Admin Shares',
    },
    {
      rule: 'Kerberoasting Detected',
      tactic: 'Credential Access',
      technique: 'Steal or Forge Kerberos Tickets',
    },
    {
      rule: 'Web Shell File Created',
      tactic: 'Persistence',
      technique: 'Server Software Component',
    },
    {
      rule: 'Privilege Escalation via SUID Binary',
      tactic: 'Privilege Escalation',
      technique: 'Abuse Elevation Control Mechanism',
    },
  ],
  medium: [
    {
      rule: 'Scheduled Task in Unusual Location',
      tactic: 'Persistence',
      technique: 'Scheduled Task/Job',
    },
    {
      rule: 'Suspicious Registry Key Modified',
      tactic: 'Defense Evasion',
      technique: 'Modify Registry',
    },
    {
      rule: 'Network Scanning Activity Detected',
      tactic: 'Discovery',
      technique: 'Network Service Discovery',
    },
    {
      rule: 'Unusual DNS Query Volume',
      tactic: 'Command and Control',
      technique: 'Application Layer Protocol',
    },
    {
      rule: 'Outbound Connection to Threat Intelligence Blocklist IP',
      tactic: 'Command and Control',
      technique: 'Application Layer Protocol',
    },
  ],
  low: [
    {
      rule: 'Software Installed by Non-Admin User',
      tactic: 'Persistence',
      technique: 'Boot or Logon Autostart Execution',
    },
    {
      rule: 'USB Drive Inserted on Endpoint',
      tactic: 'Initial Access',
      technique: 'Replication Through Removable Media',
    },
    { rule: 'Browser Extension Installed', tactic: 'Persistence', technique: 'Browser Extensions' },
    { rule: 'Phishing Link Clicked', tactic: 'Initial Access', technique: 'Phishing' },
    {
      rule: 'Screensaver Executable Modified',
      tactic: 'Persistence',
      technique: 'Boot or Logon Autostart Execution',
    },
  ],
};

const RISK_SCORE_BY_SEVERITY: Record<string, number> = {
  critical: 99,
  high: 73,
  medium: 47,
  low: 18,
};

const OTHER_HOSTS = [
  'workstation-42',
  'laptop-finance-07',
  'desktop-hr-03',
  'server-prod-01',
  'workstation-dev-11',
  'laptop-legal-02',
  'desktop-exec-01',
  'server-backup-01',
  'workstation-support-08',
  'laptop-remote-06',
  'desktop-reception-04',
  'db-server-02',
  'fileserver-01',
  'workstation-mktg-05',
  'laptop-sales-09',
  'app-server-03',
];

const USERS = [
  'alice.smith',
  'bob.jones',
  'carol.white',
  'david.brown',
  'eve.chen',
  'frank.miller',
  'grace.lee',
  'henry.wilson',
  'iris.wang',
  'james.taylor',
];

// ── Priority triage group (100 alerts) ───────────────────────────────────────

export const PRIORITY_TRIAGE_IDS: string[] = Array.from(
  { length: 100 },
  (_, i) => `triage-eval-priority-${i.toString().padStart(3, '0')}`
);

// Severity distribution: 1 critical (at index 49), 9 high, 30 medium, 60 low.
// The critical alert is intentionally buried mid-list to test whether the LLM
// scans all alerts rather than stopping after the first few.
const severityAt = (i: number): string => {
  if (i === 49) return 'critical';
  if (i < 10) return 'high';
  if (i < 40) return 'medium';
  return 'low';
};

const PRIORITY_TRIAGE_ALERTS: SyntheticAlert[] = PRIORITY_TRIAGE_IDS.map((id, i) => {
  const severity = severityAt(i);
  const rules = RULES_BY_SEVERITY[severity];
  const { rule, tactic, technique } = rules[i % rules.length];
  const host = OTHER_HOSTS[i % OTHER_HOSTS.length];
  const user = USERS[i % USERS.length];
  return {
    id,
    doc: {
      '@timestamp': ts(i),
      'kibana.alert.rule.name': rule,
      'kibana.alert.severity': severity,
      'kibana.alert.risk_score': RISK_SCORE_BY_SEVERITY[severity],
      'kibana.alert.uuid': id,
      'kibana.alert.workflow_status': 'open',
      'kibana.alert.rule.category': 'Custom Query',
      'kibana.alert.reason': `${rule} triggered on ${host}`,
      'host.name': host,
      'user.name': user,
      'threat.tactic.name': tactic,
      'threat.technique.name': technique,
    },
  };
});

// ── Entity correlation group (100 alerts) ─────────────────────────────────────

export const ENTITY_CORRELATION_IDS: string[] = Array.from(
  { length: 100 },
  (_, i) => `triage-eval-correlation-${i.toString().padStart(3, '0')}`
);

// web-server-01 attack progression (20 alerts, indices chosen to scatter them
// throughout the list so the LLM must synthesise across the full batch set).
const WEB_SERVER_INDICES = new Set([
  2, 7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57, 62, 67, 72, 77, 82, 87, 92, 97,
]);

const WEB_SERVER_ATTACKS = [
  {
    rule: 'SQL Injection Attempt Detected',
    tactic: 'Initial Access',
    technique: 'Exploit Public-Facing Application',
    user: 'www-data',
  },
  {
    rule: 'Web Shell File Created',
    tactic: 'Persistence',
    technique: 'Server Software Component',
    user: 'www-data',
  },
  {
    rule: 'Unusual Outbound Data Transfer from Web Process',
    tactic: 'Exfiltration',
    technique: 'Exfiltration Over C2 Channel',
    user: 'www-data',
  },
  {
    rule: 'Reverse Shell Spawned from Web Process',
    tactic: 'Execution',
    technique: 'Command and Scripting Interpreter',
    user: 'root',
  },
  {
    rule: 'Privilege Escalation via SUID Binary',
    tactic: 'Privilege Escalation',
    technique: 'Abuse Elevation Control Mechanism',
    user: 'root',
  },
  {
    rule: 'Credential Dumping via /etc/shadow Read',
    tactic: 'Credential Access',
    technique: 'OS Credential Dumping',
    user: 'root',
  },
  {
    rule: 'Lateral Movement Attempt from Web Server',
    tactic: 'Lateral Movement',
    technique: 'Remote Services',
    user: 'root',
  },
  {
    rule: 'Suspicious Cron Job Installed',
    tactic: 'Persistence',
    technique: 'Scheduled Task/Job',
    user: 'root',
  },
  {
    rule: 'Port Scanning from Compromised Web Server',
    tactic: 'Discovery',
    technique: 'Network Service Discovery',
    user: 'root',
  },
  {
    rule: 'Data Staged in Temp Directory',
    tactic: 'Collection',
    technique: 'Data Staged',
    user: 'root',
  },
];

let webServerAttackIndex = 0;

const ENTITY_CORRELATION_ALERTS: SyntheticAlert[] = ENTITY_CORRELATION_IDS.map((id, i) => {
  const isWebServer = WEB_SERVER_INDICES.has(i);
  const otherHostIndex =
    Math.floor((i - (WEB_SERVER_INDICES.size > 0 ? 0 : 0)) / 1) % OTHER_HOSTS.length;

  if (isWebServer) {
    const attack = WEB_SERVER_ATTACKS[webServerAttackIndex % WEB_SERVER_ATTACKS.length];
    webServerAttackIndex++;
    const severity =
      webServerAttackIndex % 5 === 0
        ? 'critical'
        : webServerAttackIndex % 3 === 0
        ? 'high'
        : 'high';
    return {
      id,
      doc: {
        '@timestamp': ts(i),
        'kibana.alert.rule.name': attack.rule,
        'kibana.alert.severity': severity,
        'kibana.alert.risk_score': RISK_SCORE_BY_SEVERITY[severity],
        'kibana.alert.uuid': id,
        'kibana.alert.workflow_status': 'open',
        'kibana.alert.rule.category': 'Custom Query',
        'kibana.alert.reason': `${attack.rule} detected on web-server-01`,
        'host.name': 'web-server-01',
        'user.name': attack.user,
        'threat.tactic.name': attack.tactic,
        'threat.technique.name': attack.technique,
      },
    };
  }

  const severity = i % 7 === 0 ? 'high' : i % 3 === 0 ? 'medium' : 'low';
  const rules = RULES_BY_SEVERITY[severity];
  const { rule, tactic, technique } = rules[i % rules.length];
  const host = OTHER_HOSTS[otherHostIndex % OTHER_HOSTS.length];
  const user = USERS[i % USERS.length];
  return {
    id,
    doc: {
      '@timestamp': ts(i),
      'kibana.alert.rule.name': rule,
      'kibana.alert.severity': severity,
      'kibana.alert.risk_score': RISK_SCORE_BY_SEVERITY[severity],
      'kibana.alert.uuid': id,
      'kibana.alert.workflow_status': 'open',
      'kibana.alert.rule.category': 'Custom Query',
      'kibana.alert.reason': `${rule} triggered on ${host}`,
      'host.name': host,
      'user.name': user,
      'threat.tactic.name': tactic,
      'threat.technique.name': technique,
    },
  };
});

// ── Combined exports ──────────────────────────────────────────────────────────

export const ALL_TRIAGE_EVAL_IDS: string[] = [...PRIORITY_TRIAGE_IDS, ...ENTITY_CORRELATION_IDS];

export const ALL_TRIAGE_EVAL_ALERTS: SyntheticAlert[] = [
  ...PRIORITY_TRIAGE_ALERTS,
  ...ENTITY_CORRELATION_ALERTS,
];
