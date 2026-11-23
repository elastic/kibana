/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Synthetic batches, no real data. `expected` is what an offline replay of the grouping rules makes
// of the batches (wide key, pooling, 72 hours, 24 hour margin). The offline tooling is not checked
// in: it shares code with scripts that read real alert dumps (real hostnames, users and command
// lines), and those cannot be checked in. Change `expected` only together with an updated replay.
// The 1,000 alert and 20 revision caps are tested in grouping_replay_parity.test.ts.
export interface ReplayParityScenario {
  name: string;
  why: string;
  docs: Record<string, Record<string, unknown>>;
  batches: Array<{ hours: number; ids: string[] }>;
  expected: {
    proposals: Array<{ hours: number; size: number; revisions: number }>;
    joined: number;
  };
}

const windows = (rule: string, folder: string): Record<string, unknown> => ({
  'kibana.alert.rule.uuid': rule,
  'kibana.alert.rule.revision': 1,
  host: { os: { type: 'windows' } },
  process: { executable: `C:\\${folder}\\run.exe`, code_signature: { subject_name: 'Acme' } },
});

const cloud = (rule: string, user: string): Record<string, unknown> => ({
  'kibana.alert.rule.uuid': rule,
  'kibana.alert.rule.revision': 1,
  user: { name: user },
});

export const REPLAY_PARITY_SCENARIOS: ReplayParityScenario[] = [
  {
    name: 'same_key_twice',
    why: 'a second batch with the key of an open proposal joins it',
    docs: {
      1: windows('rule-1', 'a'),
      2: windows('rule-1', 'a'),
      3: windows('rule-1', 'a'),
      4: windows('rule-1', 'a'),
    },
    batches: [
      { hours: 0, ids: ['1', '2'] },
      { hours: 1, ids: ['3', '4'] },
    ],
    expected: { proposals: [{ hours: 0, size: 4, revisions: 2 }], joined: 2 },
  },
  {
    name: 'lone_alerts_pool',
    why: 'lone alerts with no open proposal share one pooled proposal',
    docs: {
      1: windows('rule-1', 'a'),
      2: windows('rule-1', 'b'),
      3: windows('rule-1', 'c'),
      4: windows('rule-1', 'c'),
    },
    batches: [{ hours: 0, ids: ['1', '2', '3', '4'] }],
    expected: {
      proposals: [
        { hours: 0, size: 2, revisions: 1 },
        { hours: 0, size: 2, revisions: 1 },
      ],
      joined: 0,
    },
  },
  {
    name: 'lone_alert_joins',
    why: 'a lone alert whose key has an open proposal joins it instead of pooling',
    docs: {
      1: windows('rule-1', 'a'),
      2: windows('rule-1', 'a'),
      3: windows('rule-1', 'a'),
      4: windows('rule-1', 'b'),
    },
    batches: [
      { hours: 0, ids: ['1', '2'] },
      { hours: 2, ids: ['3', '4'] },
    ],
    expected: {
      proposals: [
        { hours: 0, size: 3, revisions: 2 },
        { hours: 2, size: 1, revisions: 1 },
      ],
      joined: 1,
    },
  },
  {
    name: 'two_rules_one_batch',
    why: 'the same program under two rules is two keys',
    docs: {
      1: windows('rule-1', 'a'),
      2: windows('rule-1', 'a'),
      3: windows('rule-2', 'a'),
      4: windows('rule-2', 'a'),
      5: windows('rule-2', 'a'),
      6: windows('rule-2', 'a'),
    },
    batches: [
      { hours: 0, ids: ['1', '2', '3', '4'] },
      { hours: 1, ids: ['5', '6'] },
    ],
    expected: {
      proposals: [
        { hours: 0, size: 2, revisions: 1 },
        { hours: 0, size: 4, revisions: 2 },
      ],
      joined: 2,
    },
  },
  {
    name: 'cloud_fallback',
    why: 'alerts with no identifying field group by rule and detection only',
    docs: {
      1: cloud('cloud-rule', 'u1'),
      2: cloud('cloud-rule', 'u2'),
      3: cloud('cloud-rule', 'u3'),
      4: cloud('cloud-rule', 'u4'),
      5: cloud('cloud-rule', 'u5'),
      6: cloud('cloud-rule-2', 'u6'),
    },
    batches: [
      { hours: 0, ids: ['1', '2', '3'] },
      { hours: 3, ids: ['4', '5'] },
      { hours: 4, ids: ['6'] },
    ],
    expected: {
      proposals: [
        { hours: 0, size: 5, revisions: 2 },
        { hours: 4, size: 1, revisions: 1 },
      ],
      joined: 2,
    },
  },
  {
    name: 'join_margin',
    why: 'a proposal takes no join in its last 24 of 72 hours',
    docs: Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [`${i + 1}`, windows('rule-1', 'a')])
    ),
    batches: [
      { hours: 0, ids: ['1', '2'] },
      { hours: 47, ids: ['3', '4'] },
      { hours: 48, ids: ['5', '6'] },
      { hours: 49, ids: ['7', '8'] },
      { hours: 125, ids: ['9', '10'] },
    ],
    expected: {
      proposals: [
        { hours: 0, size: 4, revisions: 2 },
        { hours: 48, size: 4, revisions: 2 },
        { hours: 125, size: 2, revisions: 1 },
      ],
      joined: 4,
    },
  },
];
