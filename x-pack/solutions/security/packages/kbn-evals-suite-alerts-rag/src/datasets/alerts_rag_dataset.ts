/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertDocument, AlertsRagExample } from '../dataset';

// ── Fixture helpers (not exported – private to this dataset file) ─────────────

const makeAlert = (
  alertId: string,
  timestamp: string,
  hostName: string,
  severity: 'critical' | 'high',
  ruleName: string
): AlertDocument => ({
  _id: alertId,
  _source: {
    '@timestamp': timestamp,
    host: { name: hostName },
    user: { name: 'Administrator' },
    kibana: {
      alert: {
        rule: { name: ruleName },
        severity,
        status: 'open',
      },
    },
  },
});

/** Returns an ISO-8601 timestamp for the n-th alert (1-based), spaced 15 min apart on 2024-08-20. */
const mkTimestamp = (n: number): string => {
  const minutes = (n - 1) * 15;
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return `2024-08-20T${hh}:${mm}:00.000Z`;
};

const RULE_NAMES = [
  'Malware - Malicious File Creation',
  'Credential Access - LSASS Memory Dump',
  'Persistence - Registry Run Key Modification',
  'Discovery - Network Share Enumeration',
  'Lateral Movement - Pass the Hash',
  'Defense Evasion - Process Injection',
  'Command and Control - DNS Beacon',
  'Execution - PowerShell Download Cradle',
  'Exfiltration - Unusual Data Transfer',
  'Impact - Shadow Copy Deletion',
] as const;

const ruleAt = (n: number) => RULE_NAMES[(n - 1) % RULE_NAMES.length];
const mkAlertId = (n: number) => `rag-alert-${String(n).padStart(3, '0')}`;

// ── Scenario context ──────────────────────────────────────────────────────────

/**
 * 95 open alerts forming the evaluation scenario (Episodes 1-8).
 *
 * Distribution: 85 critical + 10 high across 15 hosts
 * (9 main hosts + 6 "-PRIV" prevention variants). All alerts are attributed
 * to user "Administrator". Timestamps span 2024-08-20 in 15-minute intervals.
 *
 * This context is shared by all 6 evaluation examples because every question
 * in the dataset reasons over the same alert backdrop.
 */
const SCENARIO_CONTEXT: AlertDocument[] = [
  // ── SRVMAC08 – 10 critical ────────────────────────────────────────────────
  makeAlert(mkAlertId(1), mkTimestamp(1), 'SRVMAC08', 'critical', ruleAt(1)),
  makeAlert(mkAlertId(2), mkTimestamp(2), 'SRVMAC08', 'critical', ruleAt(2)),
  makeAlert(mkAlertId(3), mkTimestamp(3), 'SRVMAC08', 'critical', ruleAt(3)),
  makeAlert(mkAlertId(4), mkTimestamp(4), 'SRVMAC08', 'critical', ruleAt(4)),
  makeAlert(mkAlertId(5), mkTimestamp(5), 'SRVMAC08', 'critical', ruleAt(5)),
  makeAlert(mkAlertId(6), mkTimestamp(6), 'SRVMAC08', 'critical', ruleAt(6)),
  makeAlert(mkAlertId(7), mkTimestamp(7), 'SRVMAC08', 'critical', ruleAt(7)),
  makeAlert(mkAlertId(8), mkTimestamp(8), 'SRVMAC08', 'critical', ruleAt(8)),
  makeAlert(mkAlertId(9), mkTimestamp(9), 'SRVMAC08', 'critical', ruleAt(9)),
  makeAlert(mkAlertId(10), mkTimestamp(10), 'SRVMAC08', 'critical', ruleAt(10)),
  // ── SRVWIN01 – 9 critical ─────────────────────────────────────────────────
  makeAlert(mkAlertId(11), mkTimestamp(11), 'SRVWIN01', 'critical', ruleAt(1)),
  makeAlert(mkAlertId(12), mkTimestamp(12), 'SRVWIN01', 'critical', ruleAt(2)),
  makeAlert(mkAlertId(13), mkTimestamp(13), 'SRVWIN01', 'critical', ruleAt(3)),
  makeAlert(mkAlertId(14), mkTimestamp(14), 'SRVWIN01', 'critical', ruleAt(4)),
  makeAlert(mkAlertId(15), mkTimestamp(15), 'SRVWIN01', 'critical', ruleAt(5)),
  makeAlert(mkAlertId(16), mkTimestamp(16), 'SRVWIN01', 'critical', ruleAt(6)),
  makeAlert(mkAlertId(17), mkTimestamp(17), 'SRVWIN01', 'critical', ruleAt(7)),
  makeAlert(mkAlertId(18), mkTimestamp(18), 'SRVWIN01', 'critical', ruleAt(8)),
  makeAlert(mkAlertId(19), mkTimestamp(19), 'SRVWIN01', 'critical', ruleAt(9)),
  // ── SRVWIN02 – 9 critical ─────────────────────────────────────────────────
  makeAlert(mkAlertId(20), mkTimestamp(20), 'SRVWIN02', 'critical', ruleAt(10)),
  makeAlert(mkAlertId(21), mkTimestamp(21), 'SRVWIN02', 'critical', ruleAt(1)),
  makeAlert(mkAlertId(22), mkTimestamp(22), 'SRVWIN02', 'critical', ruleAt(2)),
  makeAlert(mkAlertId(23), mkTimestamp(23), 'SRVWIN02', 'critical', ruleAt(3)),
  makeAlert(mkAlertId(24), mkTimestamp(24), 'SRVWIN02', 'critical', ruleAt(4)),
  makeAlert(mkAlertId(25), mkTimestamp(25), 'SRVWIN02', 'critical', ruleAt(5)),
  makeAlert(mkAlertId(26), mkTimestamp(26), 'SRVWIN02', 'critical', ruleAt(6)),
  makeAlert(mkAlertId(27), mkTimestamp(27), 'SRVWIN02', 'critical', ruleAt(7)),
  makeAlert(mkAlertId(28), mkTimestamp(28), 'SRVWIN02', 'critical', ruleAt(8)),
  // ── SRVWIN03 – 8 critical ─────────────────────────────────────────────────
  makeAlert(mkAlertId(29), mkTimestamp(29), 'SRVWIN03', 'critical', ruleAt(9)),
  makeAlert(mkAlertId(30), mkTimestamp(30), 'SRVWIN03', 'critical', ruleAt(10)),
  makeAlert(mkAlertId(31), mkTimestamp(31), 'SRVWIN03', 'critical', ruleAt(1)),
  makeAlert(mkAlertId(32), mkTimestamp(32), 'SRVWIN03', 'critical', ruleAt(2)),
  makeAlert(mkAlertId(33), mkTimestamp(33), 'SRVWIN03', 'critical', ruleAt(3)),
  makeAlert(mkAlertId(34), mkTimestamp(34), 'SRVWIN03', 'critical', ruleAt(4)),
  makeAlert(mkAlertId(35), mkTimestamp(35), 'SRVWIN03', 'critical', ruleAt(5)),
  makeAlert(mkAlertId(36), mkTimestamp(36), 'SRVWIN03', 'critical', ruleAt(6)),
  // ── SRVWIN04 – 8 critical ─────────────────────────────────────────────────
  makeAlert(mkAlertId(37), mkTimestamp(37), 'SRVWIN04', 'critical', ruleAt(7)),
  makeAlert(mkAlertId(38), mkTimestamp(38), 'SRVWIN04', 'critical', ruleAt(8)),
  makeAlert(mkAlertId(39), mkTimestamp(39), 'SRVWIN04', 'critical', ruleAt(9)),
  makeAlert(mkAlertId(40), mkTimestamp(40), 'SRVWIN04', 'critical', ruleAt(10)),
  makeAlert(mkAlertId(41), mkTimestamp(41), 'SRVWIN04', 'critical', ruleAt(1)),
  makeAlert(mkAlertId(42), mkTimestamp(42), 'SRVWIN04', 'critical', ruleAt(2)),
  makeAlert(mkAlertId(43), mkTimestamp(43), 'SRVWIN04', 'critical', ruleAt(3)),
  makeAlert(mkAlertId(44), mkTimestamp(44), 'SRVWIN04', 'critical', ruleAt(4)),
  // ── SRVWIN05 – 8 critical ─────────────────────────────────────────────────
  makeAlert(mkAlertId(45), mkTimestamp(45), 'SRVWIN05', 'critical', ruleAt(5)),
  makeAlert(mkAlertId(46), mkTimestamp(46), 'SRVWIN05', 'critical', ruleAt(6)),
  makeAlert(mkAlertId(47), mkTimestamp(47), 'SRVWIN05', 'critical', ruleAt(7)),
  makeAlert(mkAlertId(48), mkTimestamp(48), 'SRVWIN05', 'critical', ruleAt(8)),
  makeAlert(mkAlertId(49), mkTimestamp(49), 'SRVWIN05', 'critical', ruleAt(9)),
  makeAlert(mkAlertId(50), mkTimestamp(50), 'SRVWIN05', 'critical', ruleAt(10)),
  makeAlert(mkAlertId(51), mkTimestamp(51), 'SRVWIN05', 'critical', ruleAt(1)),
  makeAlert(mkAlertId(52), mkTimestamp(52), 'SRVWIN05', 'critical', ruleAt(2)),
  // ── SRVWIN06 – 8 critical ─────────────────────────────────────────────────
  makeAlert(mkAlertId(53), mkTimestamp(53), 'SRVWIN06', 'critical', ruleAt(3)),
  makeAlert(mkAlertId(54), mkTimestamp(54), 'SRVWIN06', 'critical', ruleAt(4)),
  makeAlert(mkAlertId(55), mkTimestamp(55), 'SRVWIN06', 'critical', ruleAt(5)),
  makeAlert(mkAlertId(56), mkTimestamp(56), 'SRVWIN06', 'critical', ruleAt(6)),
  makeAlert(mkAlertId(57), mkTimestamp(57), 'SRVWIN06', 'critical', ruleAt(7)),
  makeAlert(mkAlertId(58), mkTimestamp(58), 'SRVWIN06', 'critical', ruleAt(8)),
  makeAlert(mkAlertId(59), mkTimestamp(59), 'SRVWIN06', 'critical', ruleAt(9)),
  makeAlert(mkAlertId(60), mkTimestamp(60), 'SRVWIN06', 'critical', ruleAt(10)),
  // ── SRVWIN07 – 7 critical ─────────────────────────────────────────────────
  makeAlert(mkAlertId(61), mkTimestamp(61), 'SRVWIN07', 'critical', ruleAt(1)),
  makeAlert(mkAlertId(62), mkTimestamp(62), 'SRVWIN07', 'critical', ruleAt(2)),
  makeAlert(mkAlertId(63), mkTimestamp(63), 'SRVWIN07', 'critical', ruleAt(3)),
  makeAlert(mkAlertId(64), mkTimestamp(64), 'SRVWIN07', 'critical', ruleAt(4)),
  makeAlert(mkAlertId(65), mkTimestamp(65), 'SRVWIN07', 'critical', ruleAt(5)),
  makeAlert(mkAlertId(66), mkTimestamp(66), 'SRVWIN07', 'critical', ruleAt(6)),
  makeAlert(mkAlertId(67), mkTimestamp(67), 'SRVWIN07', 'critical', ruleAt(7)),
  // ── SRVNIX05 – 8 critical ─────────────────────────────────────────────────
  makeAlert(mkAlertId(68), mkTimestamp(68), 'SRVNIX05', 'critical', ruleAt(8)),
  makeAlert(mkAlertId(69), mkTimestamp(69), 'SRVNIX05', 'critical', ruleAt(9)),
  makeAlert(mkAlertId(70), mkTimestamp(70), 'SRVNIX05', 'critical', ruleAt(10)),
  makeAlert(mkAlertId(71), mkTimestamp(71), 'SRVNIX05', 'critical', ruleAt(1)),
  makeAlert(mkAlertId(72), mkTimestamp(72), 'SRVNIX05', 'critical', ruleAt(2)),
  makeAlert(mkAlertId(73), mkTimestamp(73), 'SRVNIX05', 'critical', ruleAt(3)),
  makeAlert(mkAlertId(74), mkTimestamp(74), 'SRVNIX05', 'critical', ruleAt(4)),
  makeAlert(mkAlertId(75), mkTimestamp(75), 'SRVNIX05', 'critical', ruleAt(5)),
  // ── SRVMAC08-PRIV – 3 critical ────────────────────────────────────────────
  makeAlert(mkAlertId(76), mkTimestamp(76), 'SRVMAC08-PRIV', 'critical', ruleAt(6)),
  makeAlert(mkAlertId(77), mkTimestamp(77), 'SRVMAC08-PRIV', 'critical', ruleAt(7)),
  makeAlert(mkAlertId(78), mkTimestamp(78), 'SRVMAC08-PRIV', 'critical', ruleAt(8)),
  // ── SRVWIN06-PRIV – 2 critical ────────────────────────────────────────────
  makeAlert(mkAlertId(79), mkTimestamp(79), 'SRVWIN06-PRIV', 'critical', ruleAt(9)),
  makeAlert(mkAlertId(80), mkTimestamp(80), 'SRVWIN06-PRIV', 'critical', ruleAt(10)),
  // ── SRVWIN04-PRIV – 2 critical ────────────────────────────────────────────
  makeAlert(mkAlertId(81), mkTimestamp(81), 'SRVWIN04-PRIV', 'critical', ruleAt(1)),
  makeAlert(mkAlertId(82), mkTimestamp(82), 'SRVWIN04-PRIV', 'critical', ruleAt(2)),
  // ── SRVWIN03-PRIV – 1 critical ────────────────────────────────────────────
  makeAlert(mkAlertId(83), mkTimestamp(83), 'SRVWIN03-PRIV', 'critical', ruleAt(3)),
  // ── SRVWIN02-PRIV – 1 critical ────────────────────────────────────────────
  makeAlert(mkAlertId(84), mkTimestamp(84), 'SRVWIN02-PRIV', 'critical', ruleAt(4)),
  // ── SRVWIN01-PRIV – 1 critical ────────────────────────────────────────────
  makeAlert(mkAlertId(85), mkTimestamp(85), 'SRVWIN01-PRIV', 'critical', ruleAt(5)),
  // ── High severity: 1 per main host (SRVNIX05 gets 2) ─────────────────────
  makeAlert(mkAlertId(86), mkTimestamp(86), 'SRVMAC08', 'high', ruleAt(6)),
  makeAlert(mkAlertId(87), mkTimestamp(87), 'SRVWIN01', 'high', ruleAt(7)),
  makeAlert(mkAlertId(88), mkTimestamp(88), 'SRVWIN02', 'high', ruleAt(8)),
  makeAlert(mkAlertId(89), mkTimestamp(89), 'SRVWIN03', 'high', ruleAt(9)),
  makeAlert(mkAlertId(90), mkTimestamp(90), 'SRVWIN04', 'high', ruleAt(10)),
  makeAlert(mkAlertId(91), mkTimestamp(91), 'SRVWIN05', 'high', ruleAt(1)),
  makeAlert(mkAlertId(92), mkTimestamp(92), 'SRVWIN06', 'high', ruleAt(2)),
  makeAlert(mkAlertId(93), mkTimestamp(93), 'SRVWIN07', 'high', ruleAt(3)),
  makeAlert(mkAlertId(94), mkTimestamp(94), 'SRVNIX05', 'high', ruleAt(4)),
  makeAlert(mkAlertId(95), mkTimestamp(95), 'SRVNIX05', 'high', ruleAt(5)),
];

// ── Dataset ───────────────────────────────────────────────────────────────────

/**
 * All 6 examples from LangSmith dataset "Alerts RAG Regression (Episodes 1-8)"
 * (id: bd5bba1d-97aa-4512-bce7-b09aa943c651, exported 2026-05-07).
 *
 * Tests the Security AI Assistant's ability to retrieve and reason about alert
 * data via RAG. Scenario: 95 open alerts (85 critical, 10 high) spanning hosts
 * SRVMAC08, SRVWIN01–07, SRVNIX05, and their -PRIV variants; primary user:
 * Administrator.
 *
 * Category breakdown:
 *   multi_alert_correlation  – 4 examples (aggregate counts, prioritisation)
 *   field_specific_lookup    – 2 examples (hosts, user field values)
 */
export const alertsRagDataset: AlertsRagExample[] = [
  // ── Multi-alert correlation (aggregate counts) ────────────────────────────
  {
    langsmithExampleId: '5caa283f-eabd-460b-a48d-d308e6378508',
    input: 'How many open alerts do I have?',
    expected: {
      reference: 'There is a total of 95 open alerts.',
    },
    context: SCENARIO_CONTEXT,
    metadata: { category: 'multi_alert_correlation', dataset_split: ['base'] },
  },
  {
    langsmithExampleId: '8199e09a-d175-4808-be93-012e51d4ecac',
    input: 'How many critical severity alerts are there?',
    expected: {
      reference: 'There are 85 critical severity alerts in your environment.',
    },
    context: SCENARIO_CONTEXT,
    metadata: { category: 'multi_alert_correlation', dataset_split: ['base'] },
  },
  {
    langsmithExampleId: '82ca4de2-e4fb-4211-9e98-ae5a2fadf2cb',
    input: 'How many high severity alerts are there?',
    expected: {
      reference: 'There are 10 high severity alerts in your environment.',
    },
    context: SCENARIO_CONTEXT,
    metadata: { category: 'multi_alert_correlation', dataset_split: ['base'] },
  },

  // ── Multi-alert correlation (prioritisation) ──────────────────────────────
  {
    langsmithExampleId: 'd33b2ebc-0c80-4689-89c0-1d8b63ba5af1',
    input: 'Which alerts should I look at first?',
    expected: {
      reference: `Based on the alert counts from the last 24 hours, I recommend focusing on the critical alerts first.\nGiven this information, you should prioritize your attention as follows:\n\n1. Start with the critical alerts. These pose the highest risk to your environment and require immediate attention.\n2. After addressing the critical alerts, move on to the high severity alerts.`,
    },
    context: SCENARIO_CONTEXT,
    metadata: { category: 'multi_alert_correlation', dataset_split: ['base'] },
  },

  // ── Field-specific lookup ─────────────────────────────────────────────────
  {
    langsmithExampleId: 'e4c66fba-0f53-43bb-b923-a11f5d39b84b',
    input: 'Which "user.name" is mentioned the most in the open alerts?',
    expected: {
      reference: 'The user name "Administrator" is mentioned the most in the open alerts.',
    },
    context: SCENARIO_CONTEXT,
    metadata: { category: 'field_specific_lookup', dataset_split: ['base'] },
  },
  {
    langsmithExampleId: '9e6ed876-5308-4a24-b931-03bf72a49200',
    input: 'Based on my open alerts, what hosts are affected?',
    expected: {
      reference: `Based on the data provided, here's a summary of the hosts affected by open alerts:\n\n1. SRVMAC08\n2. SRVWIN07\n3. SRVWIN06\n4. SRVNIX05\n5. SRVWIN04\n6. SRVWIN03\n7. SRVWIN02\n8. SRVWIN01\n\nAdditionally, there are some hosts with the "-PRIV" suffix, which appear to be related to prevention alerts:\n\n9. SRVMAC08-PRIV\n10. SRVWIN06-PRIV\n11. SRVWIN04-PRIV\n12. SRVWIN03-PRIV\n13. SRVWIN02-PRIV\n14. SRVWIN01-PRIV\n\nThese hosts are affected by various types of malware, suspicious activities, and potential security threats as indicated by the alerts.`,
    },
    context: SCENARIO_CONTEXT,
    metadata: { category: 'field_specific_lookup', dataset_split: ['base'] },
  },
];
