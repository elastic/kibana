/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Golden dataset for Deep Watch gate discrimination.
 *
 * Every row pairs an Attack Discovery narrative with the ground truth for two
 * separable questions:
 *   1. `expectedIncident` -- should triage escalate?
 *   2. `expectForensics`  -- should the gated forensic step run?
 *
 * The second is a function of the first, which is the invariant under test: the
 * `reconstruct_if_incident` gate must open on true and stay shut on false.
 *
 * Rows deliberately include a case where the narrative claims "benign" but the
 * seeded telemetry contradicts it. A suite containing only clean positives
 * cannot distinguish a working gate from a gate wired permanently open --
 * that is the discrimination requirement in the AlertZero gate test plan.
 */
export interface DeepWatchGoldenRow {
  /** Stable golden id; also the Attack Discovery `_id` seeded for the row. */
  id: string;
  description: string;
  /** Host the narrative points at. Determines whether telemetry backs it up. */
  host: string;
  title: string;
  summary: string;
  details: string;
  /** Ground truth: does this warrant escalation? */
  expectedIncident: boolean;
  /** Ground truth: must the gated forensic step execute? */
  expectForensics: boolean;
  /** `happy` = clean signal, `contradiction` = narrative fights the evidence. */
  rowType: 'happy' | 'contradiction';
}

/** Host carrying the seeded ransomware kill chain. */
export const COMPROMISED_HOST = 'WKSTN-RECV01';
/** Host with zero seeded telemetry -- a benign narrative here has no contradiction. */
export const QUIET_HOST = 'WKSTN-QUIET99';

export const DEEP_WATCH_GOLDEN_ROWS: DeepWatchGoldenRow[] = [
  {
    id: 'dw-001-ransomware-kill-chain',
    description:
      'Full ransomware kill chain on a host with corroborating telemetry. Triage must ' +
      'escalate and the forensic step must run.',
    host: COMPROMISED_HOST,
    title: `Ransomware kill chain: ${COMPROMISED_HOST} to SRV-DC01`,
    summary:
      'Phishing attachment executed on WKSTN-RECV01 led to PowerShell C2 beaconing, ' +
      'credential access, lateral movement to SRV-DC01, and shadow copy deletion.',
    details:
      '## Ransomware kill chain\n' +
      'OUTLOOK.EXE spawned a macro-enabled attachment on WKSTN-RECV01. powershell.exe ' +
      'established outbound TLS to 185.220.101.42:443, credentials were harvested, and ' +
      'SMB writes reached SRV-DC01. vssadmin.exe deleted volume shadow copies.',
    expectedIncident: true,
    expectForensics: true,
    rowType: 'happy',
  },
  {
    id: 'dw-002-benign-patch-window',
    description:
      'Routine patching on a host with no telemetry to contradict it. Triage must NOT ' +
      'escalate and the forensic step must be skipped.',
    host: QUIET_HOST,
    title: `Scheduled Windows Update maintenance on ${QUIET_HOST}`,
    summary:
      'Scheduled Windows Update maintenance window. Signed Microsoft binaries executed ' +
      'by the SYSTEM account during the approved patch window. No credential access, ' +
      'no lateral movement, no data staging observed.',
    details:
      '## Routine maintenance\n' +
      'wuauclt.exe and TrustedInstaller.exe, both signed by Microsoft, were launched by ' +
      'the Windows Update service during the scheduled patch window. Parent processes ' +
      'are expected. No egress to untrusted destinations. No shadow copy deletion.',
    expectedIncident: false,
    expectForensics: false,
    rowType: 'happy',
  },
  {
    id: 'dw-003-benign-narrative-hostile-telemetry',
    description:
      'A benign "maintenance" narrative pointed at the COMPROMISED host. The telemetry ' +
      'contradicts the summary, so triage should escalate on evidence rather than ' +
      'trusting the label -- and forensics must then run.',
    host: COMPROMISED_HOST,
    title: `Scheduled Windows Update maintenance on ${COMPROMISED_HOST}`,
    summary:
      'Scheduled Windows Update maintenance window. Signed Microsoft binaries executed ' +
      'by the SYSTEM account. No credential access or lateral movement observed.',
    details:
      '## Routine maintenance\n' +
      'Reported as expected administrative activity during the Tuesday patch window.',
    expectedIncident: true,
    expectForensics: true,
    rowType: 'contradiction',
  },
];

export const DEEP_WATCH_ROW_BY_ID = new Map(DEEP_WATCH_GOLDEN_ROWS.map((r) => [r.id, r]));
