/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Fake report used by the detonation flyout prototype. Plain data (not translated) on purpose.
 */

export type Severity = 'High' | 'Med';

export const REPORT = {
  fileName: 'invoice_Q3_final.exe',
  reportId: 'det_275a021bbfb6',
  sha256: '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
  submitted: 'Nov 11, 2026 @ 09:41 UTC · by tavner@acme.io',
  sourceLink: 'Case #4821',
  sourceText: 'File upload (222 KiB, PE32)',
  score: 92,
};

export const VERDICT_REASONS: Array<{
  severity: Severity;
  title: string;
  detail?: string;
  points: number;
}> = [
  {
    severity: 'High',
    title: 'Writes data to a remote process',
    detail: 'Process injection · T1055',
    points: 30,
  },
  {
    severity: 'High',
    title: 'Contacts known C2 infrastructure',
    detail: '185.220.101.47 matched Suricata ET MALWARE rule',
    points: 28,
  },
  {
    severity: 'High',
    title: 'YARA match: Win32_NukeBot',
    detail: 'Matched in unpacked memory',
    points: 20,
  },
  {
    severity: 'Med',
    title: 'Reads terminal service keys (RDP)',
    detail: 'Remote access · T1021',
    points: 9,
  },
  { severity: 'Med', title: 'Signed with an invalid certificate', points: 5 },
];

export type NetworkFlag = 'C2' | 'Recon' | 'Benign';

export const NETWORK_ROWS: Array<{
  id: string;
  host: string;
  detail: string;
  port: number;
  flag: NetworkFlag;
  isMalicious?: boolean;
}> = [
  {
    id: 'n1',
    host: '185.220.101.47',
    detail: 'TCP · 14 sessions',
    port: 443,
    flag: 'C2',
    isMalicious: true,
  },
  {
    id: 'n2',
    host: 'update-cdn-sync.top',
    detail: '→ 185.220.101.47',
    port: 443,
    flag: 'C2',
    isMalicious: true,
  },
  { id: 'n3', host: 'whatismyipaddress.com', detail: '→ 104.16.154.36', port: 80, flag: 'Recon' },
  { id: 'n4', host: 'time.windows.com', detail: '→ 20.101.57.9', port: 123, flag: 'Benign' },
  { id: 'n5', host: '8.8.8.8', detail: 'DNS', port: 53, flag: 'Benign' },
];

export type ActivityAction = 'Dropped' | 'Written' | 'Modified' | 'Created' | 'Deleted' | 'Started';
export type ActivityKind = 'files' | 'processes' | 'registry';

export const ACTIVITY_ROWS: Array<{
  id: string;
  kind: ActivityKind;
  action: ActivityAction;
  path: string;
}> = [
  { id: 'a1', kind: 'files', action: 'Dropped', path: '%APPDATA%\\Roaming\\svchost32.exe' },
  { id: 'a2', kind: 'files', action: 'Dropped', path: '%TEMP%\\~df3a21.tmp' },
  {
    id: 'a3',
    kind: 'files',
    action: 'Written',
    path: 'C:\\Users\\user\\invoice_Q3_final.exe:Zone.Identifier',
  },
  {
    id: 'a4',
    kind: 'files',
    action: 'Modified',
    path: 'C:\\Windows\\System32\\drivers\\etc\\hosts',
  },
  { id: 'a5', kind: 'files', action: 'Created', path: '%TEMP%\\log_8c1e.txt' },
  { id: 'a6', kind: 'files', action: 'Deleted', path: '%TEMP%\\~df3a20.tmp' },
  { id: 'p1', kind: 'processes', action: 'Started', path: 'svchost32.exe (pid 4120)' },
  { id: 'p2', kind: 'processes', action: 'Started', path: 'cmd.exe /c whoami (pid 4188)' },
  {
    id: 'p3',
    kind: 'processes',
    action: 'Modified',
    path: 'explorer.exe (remote thread, pid 1312)',
  },
  { id: 'p4', kind: 'processes', action: 'Started', path: 'powershell.exe -enc JABz… (pid 4204)' },
  {
    id: 'r1',
    kind: 'registry',
    action: 'Created',
    path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\svchost32',
  },
  {
    id: 'r2',
    kind: 'registry',
    action: 'Modified',
    path: 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server',
  },
  { id: 'r3', kind: 'registry', action: 'Written', path: 'HKCU\\Software\\Apex\\cfg' },
];

export const ACTIVITY_COUNTS = { files: 6, processes: 4, registry: 8, all: 23 };

export const SURICATA_MATCHES = [
  {
    id: 's1',
    severity: 'High' as const,
    sid: 'sid:2027865',
    name: 'ET MALWARE NukeBot CnC Checkin',
    target: '185.220.101.47:443',
  },
];

export const YARA_MATCHES = [
  {
    id: 'y1',
    severity: 'High' as const,
    rule: 'Win32_NukeBot',
    tag: 'Custom',
    detail: 'Matched in unpacked memory',
  },
  {
    id: 'y2',
    severity: 'Med' as const,
    rule: 'Inject_Remote_Thread',
    tag: undefined,
    detail: 'Elastic default ruleset',
  },
];

export const FILE_CONTEXT_ROWS: Array<[string, string]> = [
  ['Part of', 'None identified (no known framework or library)'],
  ['Created', 'Nov 5, 2026 (compile timestamp)'],
  ['First seen', 'Nov 11, 2026'],
  ['File type', 'PE32 executable (GUI), Intel 80386'],
  ['Size', '222 KiB'],
  ['Signer', 'Invalid certificate · “Apex Soft Ltd”'],
  ['MD5', '9e107d9d372bb6826bd81d3542a419d6'],
];

export const RELATED_FILES: Array<{
  id: string;
  name: string;
  relation: string;
  verdict: 'Malicious' | 'Suspicious';
}> = [
  { id: 'f1', name: 'svchost32.exe', relation: 'Dropped', verdict: 'Malicious' },
  { id: 'f2', name: 'a41f09…77c2', relation: 'Same C2', verdict: 'Malicious' },
  { id: 'f3', name: 'e0c7bb…1d90', relation: 'Same YARA', verdict: 'Suspicious' },
];

/** Plain-language AI summary of the report (fake). */
export const AI_SUMMARY_HIGHLIGHTS: Array<{ title: string; text: string }> = [
  {
    title: 'What this file does',
    text: 'invoice_Q3_final.exe pretends to be an invoice, but it is really malware (a loader known as NukeBot). When it ran, it copied itself into a hidden folder, slipped code into another running program to hide, and then phoned home to a server at 185.220.101.47 that attackers are known to use.',
  },
  {
    title: 'Why it was marked malicious',
    text: 'It matched two security rules for NukeBot, it contacted known attacker infrastructure, and its digital signature is invalid. Together this gives a threat score of 92 out of 100 with high confidence.',
  },
];

export const AI_SUMMARY_RECOMMENDED_ACTIONS = [
  'Isolate dev-laptop-ej from the network.',
  'Reset the password for bob.jones.',
  'Block 185.220.101.47 and update-cdn-sync.top.',
  'Check other hosts that contacted the same server.',
];

export const AI_SUMMARY_GENERATED_AT = 'Nov 11, 2026 at 09:44';

export type EntityRiskLevel = 'Critical' | 'High' | 'Medium';

/** Fake entities involved in the detonation. */
export const AFFECTED_ENTITIES: Array<{
  id: string;
  type: 'host' | 'user';
  name: string;
  note: string;
  risk: EntityRiskLevel;
  riskScore: number;
}> = [
  {
    id: 'host:dev-laptop-ej',
    type: 'host',
    name: 'dev-laptop-ej',
    note: 'Ran the file',
    risk: 'Critical',
    riskScore: 91,
  },
  {
    id: 'user:bob.jones@example.com@unknown',
    type: 'user',
    name: 'bob.jones',
    note: 'Downloaded the file',
    risk: 'High',
    riskScore: 78,
  },
  {
    id: 'host:build-server-ci-01',
    type: 'host',
    name: 'build-server-ci-01',
    note: 'Contacted the same server',
    risk: 'Medium',
    riskScore: 54,
  },
];

/**
 * Highlighted fields of the detonation, shown like the alert flyout's highlighted fields: the
 * primary indicators (main domain, IP, key temp file and key process). Fake data.
 */
export const HIGHLIGHTED_FIELDS: Array<{ field: string; values: string[] }> = [
  { field: 'dns.question.name', values: ['update-cdn-sync.top'] },
  { field: 'destination.ip', values: ['185.220.101.47'] },
  { field: 'file.path', values: ['%TEMP%\\~df3a21.tmp'] },
  { field: 'process.name', values: ['svchost32.exe'] },
];
