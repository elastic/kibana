/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Golden dataset for Forensics Watch verdict discrimination.
 *
 * Each row pairs an Attack Discovery narrative with one ground-truth label:
 * `expectedIncident` -- should this escalate?
 *
 * The suite's headline metric requires observing BOTH directions: at least one
 * row the watch correctly opens AND at least one it correctly closes. An
 * all-positive dataset cannot distinguish a working watch from one wired
 * permanently open, so `dw-002` (the only negative) carries the entire closed
 * path and must never be removed without a replacement negative.
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
  /**
   * Ground truth: does this warrant escalation? Under the telemetry-first
   * architecture this single label IS the gate -- the forensic agent runs on
   * every row, so a separate "must forensics execute?" label would describe
   * nothing observable.
   */
  expectedIncident: boolean;
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
      'Full ransomware kill chain on a host with corroborating telemetry. The watch ' +
      'must return isIncident=true.',
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
    rowType: 'happy',
  },
  {
    id: 'dw-002-benign-patch-window',
    description:
      'Routine patching on a host with no telemetry to contradict it. The watch must ' +
      'return isIncident=false -- the only row that exercises the closed path.',
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
    rowType: 'happy',
  },
  {
    id: 'dw-003-benign-narrative-hostile-telemetry',
    description:
      'A benign "maintenance" narrative pointed at the COMPROMISED host. The telemetry ' +
      'contradicts the summary, so triage should escalate on evidence rather than ' +
      'trusting the label.',
    host: COMPROMISED_HOST,
    title: `Scheduled Windows Update maintenance on ${COMPROMISED_HOST}`,
    summary:
      'Scheduled Windows Update maintenance window. Signed Microsoft binaries executed ' +
      'by the SYSTEM account. No credential access or lateral movement observed.',
    details:
      '## Routine maintenance\n' +
      'Reported as expected administrative activity during the Tuesday patch window.',
    expectedIncident: true,
    rowType: 'contradiction',
  },
];

/**
 * Rows selected for this run. `DEEP_WATCH_ROWS` (comma-separated golden ids or
 * id prefixes) narrows the dataset for fast single-row probing during
 * debugging -- a full three-row cell run costs ~9 minutes of live agent time,
 * most of it spent re-confirming rows that already pass.
 *
 * The filter is debug-only and deliberately loud: a filtered run cannot satisfy
 * the discrimination requirement unless the selection still contains both a
 * positive and a negative row, so it can never be mistaken for a green suite.
 */
export const selectGoldenRows = (
  rows: DeepWatchGoldenRow[] = DEEP_WATCH_GOLDEN_ROWS,
  selector: string | undefined = process.env.DEEP_WATCH_ROWS
): DeepWatchGoldenRow[] => {
  if (!selector || selector.trim() === '') {
    return rows;
  }
  const wanted = selector
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
  const selected = rows.filter((row) => wanted.some((entry) => row.id.startsWith(entry)));
  if (selected.length === 0) {
    throw new Error(
      `DEEP_WATCH_ROWS="${selector}" matched no golden rows. Known ids: ${rows
        .map((r) => r.id)
        .join(', ')}`
    );
  }
  return selected;
};

export const DEEP_WATCH_ROW_BY_ID = new Map(DEEP_WATCH_GOLDEN_ROWS.map((r) => [r.id, r]));
