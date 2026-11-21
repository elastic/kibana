/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Facts measured from the snapshot the alerts-rag dataset is pinned to
 * ({@link ALERTS_RAG_DATASET_SNAPSHOT}: `gs://security-ai-datasets/
 * attack-discovery/oh-my-malware/2026-03-26`, snapshot `alerts-snapshot`).
 *
 * Why these live in code rather than only inside the reference strings: the
 * dataset's reference answers are the `[Ground Truth Response]` the correctness
 * judge scores against, so they have to state the facts a correct answer will
 * contain. Guidance prose ("list the distinct hostnames") makes every
 * data-bearing claim in a correct answer `NOT_IN_GROUND_TRUTH` and caps
 * Factuality near zero; pinned facts make a correct answer scoreable.
 *
 * The values below were measured from the restored snapshot across two
 * consecutive weekly eval builds (bk-01a12766 and bk-01a14b73, commit
 * 8f4c1fcc): every alert document the suite's own `security.alerts` tool
 * returned in those runs (46 calls per build, six models each, filtered to
 * `kibana.alert.workflow_status: open`) was collected and aggregated per
 * field — `kibana.alert.severity` (globally and as the parent of the
 * `kibana.alert.rule.name` / `host.name` breakdowns), `host.name`,
 * `user.name`, `kibana.alert.rule.name`, `kibana.alert.risk_score` and
 * `@timestamp`. Both builds produced byte-identical breakdowns (285 alerts,
 * 255/30 severity split, the same 16 hosts with the same per-host counts, the
 * same 3 users and 33 rule names), and the per-field counts each partition
 * that total, which is why they can be pinned as facts.
 *
 * {@link verifyAlertsRagSnapshot} re-measures every one of them against the
 * restored cluster before the suite runs, so snapshot ↔ dataset drift fails
 * loudly at the start of a run instead of silently depressing every
 * Factuality cell.
 */
export interface AlertCountByName {
  readonly name: string;
  readonly count: number;
}

export interface SeverityFacts {
  readonly count: number;
  /** Every open alert in this tier carries this risk score. */
  readonly riskScore: number;
  readonly rules: readonly AlertCountByName[];
  readonly hosts: readonly AlertCountByName[];
}

export interface AlertExamplesFacts {
  readonly timestamp: string;
  readonly ruleName: string;
  readonly hostName: string;
  readonly userName: string;
  readonly severity: 'critical' | 'high';
  readonly riskScore: number;
  readonly processName: string;
}

export interface AlertsRagExpectedFacts {
  readonly totalOpenAlerts: number;
  readonly riskScoreRange: { readonly min: number; readonly max: number };
  readonly severities: {
    readonly critical: SeverityFacts;
    readonly high: SeverityFacts;
  };
  readonly hostAlertCounts: readonly AlertCountByName[];
  readonly userAlertCounts: readonly AlertCountByName[];
  /** Newest alert in the snapshot, i.e. the answer to "What is the most recent alert?". */
  readonly mostRecentAlert: AlertExamplesFacts;
  /**
   * Representative critical alerts, newest first. "The most severe open alert"
   * has 255 equally-severe answers, so the reference states the tier facts and
   * backs them with a few of these instead of picking a single "the" alert.
   */
  readonly criticalAlertExamples: readonly AlertExamplesFacts[];
  /** Oldest high alert — the reference's example for the lowest-severity tier. */
  readonly lowestSeverityAlertExample: AlertExamplesFacts;
}

export const ALERTS_RAG_EXPECTED_FACTS: AlertsRagExpectedFacts = {
  totalOpenAlerts: 285,
  riskScoreRange: { min: 73, max: 99 },
  severities: {
    critical: {
      count: 255,
      riskScore: 99,
      rules: [
        { name: 'Malware Detection Alert', count: 81 },
        { name: 'Memory Threat Detection Alert: Shellcode Injection', count: 30 },
        {
          name: 'Malicious Behavior Detection Alert: Suspicious Microsoft Office Child Process',
          count: 18,
        },
        {
          name: 'Malicious Behavior Prevention Alert: Suspicious Microsoft Office Child Process',
          count: 15,
        },
        {
          name: 'Malicious Behavior Detection Alert: Regsvr32 with Unusual Arguments',
          count: 12,
        },
        {
          name: 'Malicious Behavior Prevention Alert: Regsvr32 with Unusual Arguments',
          count: 12,
        },
        {
          name: 'Malicious Behavior Detection Alert: Suspicious String Value Written to Registry Run Key',
          count: 9,
        },
        {
          name: 'Malicious Behavior Detection Alert: Registry Run Key Modified by Unusual Process',
          count: 6,
        },
        { name: 'Malicious Behavior Detection Alert: RunDLL32 with Unusual Arguments', count: 6 },
        { name: 'Memory Threat Detection Alert: Windows.Trojan.Emotet', count: 6 },
        {
          name: 'Malicious Behavior Detection Alert: Execution of a Windows Script File Written by a Suspicious Process',
          count: 3,
        },
        { name: 'Malicious Behavior Detection Alert: Ingress Tool Transfer via CURL', count: 3 },
        {
          name: 'Malicious Behavior Detection Alert: Library Load of a File Written by a Signed Binary Proxy',
          count: 3,
        },
        {
          name: 'Malicious Behavior Detection Alert: MsiExec Service Child Process With Network Connection',
          count: 3,
        },
        {
          name: 'Malicious Behavior Detection Alert: Potential Credentials Phishing via OSASCRIPT',
          count: 3,
        },
        {
          name: 'Malicious Behavior Detection Alert: PowerShell Obfuscation Spawned via Microsoft Office',
          count: 3,
        },
        {
          name: 'Malicious Behavior Detection Alert: Registry Persistence via Microsoft Office Descendant Process',
          count: 3,
        },
        {
          name: 'Malicious Behavior Detection Alert: RunDLL32/Regsvr32 Loads Dropped Executable',
          count: 3,
        },
        {
          name: 'Malicious Behavior Detection Alert: Script File Written by Microsoft Office Process',
          count: 3,
        },
        {
          name: 'Malicious Behavior Detection Alert: Suspicious Executable File Creation',
          count: 3,
        },
        {
          name: 'Malicious Behavior Detection Alert: Suspicious Microsoft OneNote Child Process',
          count: 3,
        },
        { name: 'Malicious Behavior Detection Alert: Suspicious MsiExec Child Process', count: 3 },
        {
          name: 'Malicious Behavior Detection Alert: Suspicious Windows Script Interpreter Child Process',
          count: 3,
        },
        {
          name: 'Malicious Behavior Detection Alert: Uncommon Persistence via Registry Modification',
          count: 3,
        },
        {
          name: 'Malicious Behavior Detection Alert: Unusual DLL Extension Loaded by Rundll32 or Regsvr32',
          count: 3,
        },
        {
          name: 'Malicious Behavior Prevention Alert: Suspicious Executable File Creation',
          count: 3,
        },
        { name: 'Memory Threat Detection Alert: Windows.Ransomware.Sodinokibi', count: 3 },
        { name: 'Memory Threat Detection Alert: Windows.Trojan.Bumblebee', count: 3 },
        { name: 'Memory Threat Detection Alert: Windows.Trojan.Qbot', count: 3 },
        { name: 'Ransomware Detection Alert', count: 3 },
      ],
      hosts: [
        { name: 'SRVWIN03', count: 63 },
        { name: 'SRVWIN04', count: 45 },
        { name: 'SRVWIN02', count: 30 },
        { name: 'SRVMAC08', count: 24 },
        { name: 'SRVWIN01', count: 24 },
        { name: 'SRVWIN03-PRIV', count: 24 },
        { name: 'SRVWIN07', count: 15 },
        { name: 'SRVNIX05', count: 12 },
        { name: 'SRVWIN06', count: 12 },
        { name: 'SRVWIN01-PRIV', count: 3 },
        { name: 'SRVWIN07-PRIV', count: 3 },
      ],
    },
    high: {
      count: 30,
      riskScore: 73,
      rules: [
        { name: 'Malware Prevention Alert', count: 24 },
        {
          name: 'Malicious Behavior Prevention Alert: Suspicious Microsoft OneNote Child Process',
          count: 3,
        },
        { name: 'Malicious Behavior Prevention Alert: Suspicious MsiExec Child Process', count: 3 },
      ],
      hosts: [
        { name: 'SRVMAC08-PRIV', count: 9 },
        { name: 'SRVWIN03-PRIV', count: 9 },
        { name: 'SRVNIX05-PRIV', count: 3 },
        { name: 'SRVWIN02-PRIV', count: 3 },
        { name: 'SRVWIN04-PRIV', count: 3 },
        { name: 'SRVWIN06-PRIV', count: 3 },
      ],
    },
  },
  hostAlertCounts: [
    { name: 'SRVWIN03', count: 63 },
    { name: 'SRVWIN04', count: 45 },
    { name: 'SRVWIN03-PRIV', count: 33 },
    { name: 'SRVWIN02', count: 30 },
    { name: 'SRVMAC08', count: 24 },
    { name: 'SRVWIN01', count: 24 },
    { name: 'SRVWIN07', count: 15 },
    { name: 'SRVNIX05', count: 12 },
    { name: 'SRVWIN06', count: 12 },
    { name: 'SRVMAC08-PRIV', count: 9 },
    { name: 'SRVNIX05-PRIV', count: 3 },
    { name: 'SRVWIN01-PRIV', count: 3 },
    { name: 'SRVWIN02-PRIV', count: 3 },
    { name: 'SRVWIN04-PRIV', count: 3 },
    { name: 'SRVWIN06-PRIV', count: 3 },
    { name: 'SRVWIN07-PRIV', count: 3 },
  ],
  userAlertCounts: [
    { name: 'Administrator', count: 237 },
    { name: 'root', count: 33 },
    { name: 'james', count: 15 },
  ],
  mostRecentAlert: {
    timestamp: '2026-03-26T22:12:18.641Z',
    ruleName: 'Malware Prevention Alert',
    hostName: 'SRVMAC08-PRIV',
    userName: 'root',
    severity: 'high',
    riskScore: 73,
    processName: 'My Go Application.app',
  },
  criticalAlertExamples: [
    {
      timestamp: '2026-03-26T22:12:18.639Z',
      ruleName: 'Malware Detection Alert',
      hostName: 'SRVMAC08',
      userName: 'james',
      severity: 'critical',
      riskScore: 99,
      processName: 'unix1',
    },
    {
      timestamp: '2026-03-26T22:12:18.438Z',
      ruleName: 'Malware Detection Alert',
      hostName: 'SRVWIN01',
      userName: 'Administrator',
      severity: 'critical',
      riskScore: 99,
      processName: 'rundll32.exe',
    },
    {
      timestamp: '2026-03-26T22:12:18.547Z',
      ruleName: 'Malicious Behavior Detection Alert: RunDLL32 with Unusual Arguments',
      hostName: 'SRVWIN04',
      userName: 'Administrator',
      severity: 'critical',
      riskScore: 99,
      processName: 'rundll32.exe',
    },
    {
      timestamp: '2026-03-26T22:12:18.619Z',
      ruleName: 'Malicious Behavior Detection Alert: Potential Credentials Phishing via OSASCRIPT',
      hostName: 'SRVMAC08',
      userName: 'james',
      severity: 'critical',
      riskScore: 99,
      processName: 'osascript',
    },
  ],
  lowestSeverityAlertExample: {
    timestamp: '2026-03-19T20:53:23.568Z',
    ruleName: 'Malware Prevention Alert',
    hostName: 'SRVWIN02-PRIV',
    userName: 'Administrator',
    severity: 'high',
    riskScore: 73,
    processName: 'explorer.exe',
  },
};

/** `name (count)` rendering used by the dataset's reference answers. */
export const formatAlertCounts = (counts: readonly AlertCountByName[]): string =>
  counts.map(({ name, count }) => `${name} (${count})`).join(', ');

/** Every open-alert rule name, most frequent first. */
export const allRuleAlertCounts = (): AlertCountByName[] =>
  [
    ...ALERTS_RAG_EXPECTED_FACTS.severities.critical.rules,
    ...ALERTS_RAG_EXPECTED_FACTS.severities.high.rules,
  ].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
