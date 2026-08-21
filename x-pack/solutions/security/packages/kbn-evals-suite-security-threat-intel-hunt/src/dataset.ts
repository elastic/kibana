/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@kbn/evals';

export interface HuntReportInput extends Record<string, unknown> {
  report_id: string;
  title: string;
  body_text: string;
}

export interface HuntReportExpected {
  techniques: string[];
}

export type HuntExample = Example<HuntReportInput, HuntReportExpected>;

/**
 * Golden threat-intel report corpus for the live-LLM Tier-2 scorecard.
 *
 * Each example pairs a realistic threat-report body (`input.body_text`) with the
 * set of MITRE ATT&CK technique ids a competent analyst would extract from it
 * (`output.techniques`). The suite drives the REAL `hunt_behavior` route (live
 * LLM) per example and scores the extracted technique set against these labels
 * with Precision@K / Recall@K / F1@K.
 *
 * Labels are intentionally conservative: each listed technique is explicitly
 * evidenced by a sentence in the body, so a miss is a real recall failure and an
 * extra technique is a real precision failure. All ids are canonical ATT&CK
 * techniques present in `@kbn/securitysolution-mitre-catalog` (the same catalog
 * `hunt_behavior` validates against), so a correct extraction can never be
 * marked wrong on a catalog technicality.
 *
 * To extend: add an entry, keep the body evidence-anchored, and pin the count in
 * `dataset.test.ts`.
 */
export const threatIntelHuntDataset: HuntExample[] = [
  {
    input: {
      report_id: 'ti-okta-session-theft',
      title: 'Okta session token theft leads to initial access',
      body_text:
        'Investigators observed an adversary using stolen Okta session tokens to authenticate as legitimate employees. The valid accounts were used for initial access to cloud consoles without triggering MFA, because the session cookies were replayed from attacker infrastructure.',
    },
    output: {
      techniques: ['T1078'],
    },
  },
  {
    input: {
      report_id: 'ti-phishing-macro-loader',
      title: 'Spearphishing attachment drops macro-based loader',
      body_text:
        'A targeted spearphishing campaign delivered a malicious attachment to finance staff. When the victim opened the document, an embedded macro executed a PowerShell command interpreter to download a second-stage loader. The phishing email impersonated a known vendor invoice thread.',
    },
    output: {
      techniques: ['T1566', 'T1059'],
    },
  },
  {
    input: {
      report_id: 'ti-ransomware-shadowcopy',
      title: 'Ransomware encrypts files after deleting shadow copies',
      body_text:
        'The intrusion culminated in data encrypted for impact across file servers. Prior to encryption the operator deleted volume shadow copies to inhibit system recovery, then dropped a ransom note in every affected directory.',
    },
    output: {
      techniques: ['T1486', 'T1490'],
    },
  },
  {
    input: {
      report_id: 'ti-uac-bypass-c2',
      title: 'UAC bypass followed by encrypted C2 beacon',
      body_text:
        'After gaining a foothold the malware performed a bypass of User Account Control to elevate privileges. It then established command and control over an HTTPS application-layer channel, beaconing to a rotating set of domains every few minutes.',
    },
    output: {
      techniques: ['T1548', 'T1071'],
    },
  },
  {
    input: {
      report_id: 'ti-obfuscated-payload-persistence',
      title: 'Obfuscated payload establishes registry run-key persistence',
      body_text:
        'The dropped payload was heavily obfuscated to evade static detection, using base64-encoded and XOR-packed strings. For persistence it wrote a registry run key so the implant relaunches at user logon.',
    },
    output: {
      techniques: ['T1027', 'T1547'],
    },
  },
  {
    input: {
      report_id: 'ti-credential-dumping-lateral',
      title: 'LSASS credential dumping enables lateral movement',
      body_text:
        'The operator dumped credentials from LSASS memory to harvest password hashes. Using the recovered credentials they moved laterally to additional hosts over remote services, authenticating with the stolen material rather than exploiting a vulnerability.',
    },
    output: {
      techniques: ['T1003', 'T1021'],
    },
  },
  {
    input: {
      report_id: 'ti-scheduled-task-discovery',
      title: 'Scheduled task persistence with local system discovery',
      body_text:
        'Following execution the malware created a scheduled task to run at fixed intervals. Before expanding, it enumerated running processes and queried system information to fingerprint the host and identify security tooling.',
    },
    output: {
      techniques: ['T1053', 'T1057'],
    },
  },
  {
    input: {
      report_id: 'ti-benign-patch-note',
      title: 'Routine infrastructure patch advisory (no adversary behavior)',
      body_text:
        'This advisory summarizes a scheduled maintenance window in which database servers were patched to the latest minor version. No indicators of compromise, adversary activity, or exploitation were observed; the note is purely operational and lists version numbers and rollback steps.',
    },
    output: {
      techniques: [],
    },
  },
];
export const REPORTS = threatIntelHuntDataset;
