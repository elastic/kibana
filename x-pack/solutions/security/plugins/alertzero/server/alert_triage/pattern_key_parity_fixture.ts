/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Synthetic documents, no real data: hand-written, with only the key fields, one or two alerts per
// kind of key. `strict` and `wide`
// number the group each alert falls in (null: no key), as an offline reference implementation of
// the keys gave them. Offline tooling generated this file. It is not checked in: it shares code
// with scripts that read real alert dumps (real hostnames, users and command lines), and those
// cannot be checked in. Change these numbers only together with an updated reference.
interface ParityAlert {
  id: string;
  doc: Record<string, unknown>;
  strict: number | null;
  wide: number | null;
}

const ACME = { subject_name: 'Acme' };
const base = { 'kibana.alert.rule.uuid': 'rule-1', 'kibana.alert.rule.revision': 1 };
const os = (type: string) => ({ os: { type } });
const AL = 'C:\\Users\\Alice\\AppData\\Tools';
const PARENT = { executable: 'C:\\Windows\\explorer.exe' };
const alice = (executable: string, extra: Record<string, unknown> = {}) => ({
  ...base,
  host: os('windows'),
  process: { executable, code_signature: ACME, parent: PARENT, ...extra },
});
const unsigned = (sha256: string) => ({
  ...base,
  host: os('windows'),
  process: { executable: 'C:\\Temp\\u.exe', hash: { sha256 } },
});
const guid = (id: string) => ({
  ...base,
  host: os('windows'),
  process: {
    executable: `C:\\ProgramData\\{3F2504E0-4F89-11D3-9A0C-${id}}\\run.exe`,
    code_signature: ACME,
  },
});
const nix = (type: string, executable: string, extra: Record<string, unknown> = {}) => ({
  ...base,
  host: os(type),
  process: { executable, ...extra },
});
const library = (dll: Record<string, unknown>, executable?: string) => ({
  ...base,
  host: os('windows'),
  event: { category: ['library'] },
  dll: { path: 'C:\\Lib\\x.dll', ...dll },
  ...(executable ? { process: { executable } } : {}),
});
const registry = (executable: string) => ({
  ...base,
  host: os('windows'),
  event: { category: ['registry'] },
  registry: { path: 'HKLM\\Software\\Vendor\\Key' },
  process: { executable },
});
const file = (path: string) => ({
  ...base,
  host: os('windows'),
  event: { category: ['file'] },
  file: { path, hash: { sha256: 'ee01' } },
  process: { executable: 'C:\\Tools\\w.exe' },
});
const defend = (extra: Record<string, unknown>) => ({
  'kibana.alert.rule.uuid': 'endpoint',
  'kibana.alert.rule.revision': 1,
  'kibana.alert.rule.rule_name_override': 'message',
  host: os('windows'),
  process: { executable: 'C:\\Tools\\w.exe', code_signature: ACME },
  ...extra,
});
const cloud = (rule: string, user: string, revision = 1) => ({
  'kibana.alert.rule.uuid': rule,
  'kibana.alert.rule.revision': revision,
  user: { name: user },
});

export const PARITY_ALERTS: ParityAlert[] = [
  { id: 'win-alice', doc: alice(`${AL}\\a.exe`), strict: 0, wide: 0 },
  {
    id: 'win-bob-same-pattern',
    doc: alice('C:\\Users\\Bob\\AppData\\Tools\\a.exe'),
    strict: 0,
    wide: 0,
  },
  {
    id: 'win-upper-case',
    doc: alice('C:\\USERS\\ALICE\\APPDATA\\TOOLS\\A.EXE'),
    strict: 0,
    wide: 0,
  },
  { id: 'win-other-program', doc: alice(`${AL}\\b.exe`), strict: 1, wide: 0 },
  {
    id: 'win-other-signer',
    doc: alice(`${AL}\\a.exe`, { code_signature: { subject_name: 'Other' } }),
    strict: 2,
    wide: 1,
  },
  { id: 'win-unsigned-hash-lower', doc: unsigned('abcdef01'), strict: 4, wide: 3 },
  { id: 'win-unsigned-hash-upper', doc: unsigned('ABCDEF01'), strict: 4, wide: 3 },
  { id: 'win-unsigned-other-hash', doc: unsigned('ffff0001'), strict: 5, wide: 4 },
  { id: 'win-guid-1', doc: guid('0305E82C3301'), strict: 7, wide: 6 },
  { id: 'win-guid-2', doc: guid('0305E82C9999'), strict: 7, wide: 6 },
  {
    id: 'mac-al',
    doc: nix('macos', '/Users/al/Applications/Tool.app/tool', { code_signature: ACME }),
    strict: 8,
    wide: 7,
  },
  {
    id: 'mac-bo-same-pattern',
    doc: nix('macos', '/Users/bo/Applications/Tool.app/tool', { code_signature: ACME }),
    strict: 8,
    wide: 7,
  },
  {
    id: 'linux-al',
    doc: nix('linux', '/home/al/bin/tool', { hash: { sha256: 'aa11' } }),
    strict: 10,
    wide: 9,
  },
  {
    id: 'linux-bo-same-pattern',
    doc: nix('linux', '/home/bo/bin/tool', { hash: { sha256: 'aa11' } }),
    strict: 10,
    wide: 9,
  },
  {
    id: 'linux-other-folder',
    doc: nix('linux', '/home/bo/sbin/tool', { hash: { sha256: 'aa11' } }),
    strict: 11,
    wide: 10,
  },
  { id: 'file-1', doc: file('C:\\Data\\f1.tmp'), strict: 13, wide: 12 },
  { id: 'file-2-same-folder', doc: file('C:\\Data\\f2.tmp'), strict: 14, wide: 12 },
  {
    id: 'library-1',
    doc: library({ code_signature: ACME }, 'C:\\Tools\\w.exe'),
    strict: 16,
    wide: 14,
  },
  {
    id: 'library-same',
    doc: library({ code_signature: ACME }, 'C:\\Other\\z.exe'),
    strict: 16,
    wide: 14,
  },
  { id: 'library-unsigned', doc: library({ hash: { sha256: 'dd01' } }), strict: 17, wide: 15 },
  { id: 'registry-1', doc: registry('C:\\Tools\\w.exe'), strict: 18, wide: 16 },
  { id: 'registry-same', doc: registry('C:\\Tools\\w.exe'), strict: 18, wide: 16 },
  { id: 'registry-other-program', doc: registry('C:\\Tools\\v.exe'), strict: 19, wide: 17 },
  {
    id: 'other-rule',
    doc: { ...alice(`${AL}\\a.exe`), 'kibana.alert.rule.uuid': 'rule-2' },
    strict: 21,
    wide: 19,
  },
  {
    id: 'other-revision',
    doc: { ...alice(`${AL}\\a.exe`), 'kibana.alert.rule.revision': 2 },
    strict: 22,
    wide: 20,
  },
  { id: 'defend-d1', doc: defend({ rule: { id: 'd1' } }), strict: 23, wide: 21 },
  { id: 'defend-d1-again', doc: defend({ rule: { id: 'd1' } }), strict: 23, wide: 21 },
  { id: 'defend-d2', doc: defend({ rule: { id: 'd2' } }), strict: 24, wide: 22 },
  {
    id: 'defend-event-code-a',
    doc: defend({ event: { code: 'shellcode_thread' } }),
    strict: 25,
    wide: 23,
  },
  { id: 'cloud-user-a', doc: cloud('cloud-rule', 'a'), strict: null, wide: 26 },
  { id: 'cloud-user-b', doc: cloud('cloud-rule', 'b'), strict: null, wide: 26 },
  { id: 'cloud-other-rule', doc: cloud('cloud-rule-2', 'a'), strict: null, wide: 27 },
  { id: 'cloud-other-revision', doc: cloud('cloud-rule', 'a', 2), strict: null, wide: 28 },
];
