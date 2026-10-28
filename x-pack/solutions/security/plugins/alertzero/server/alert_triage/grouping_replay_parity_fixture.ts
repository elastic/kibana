/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Synthetic batches, no real data. `expected` is what an offline replay of the grouping rules makes
// of the batches (wide key, pooling, 1,000 alerts, 20 revisions, 72 hours, 24 hour margin). The
// batches are hand-written synthetic alerts, and offline tooling generated this file from them. The
// tooling is not checked in: it shares code with scripts that read real alert dumps (real
// hostnames, users and command lines), and those cannot be checked in. Change `expected` only
// together with an updated replay.
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

export const REPLAY_PARITY_SCENARIOS: ReplayParityScenario[] = [
  {
    name: 'same_key_twice',
    why: 'a second batch with the key of an open proposal joins it',
    docs: {
      'same_key_twice-1': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'same_key_twice-2': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'same_key_twice-3': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'same_key_twice-4': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
    },
    batches: [
      {
        hours: 0,
        ids: ['same_key_twice-1', 'same_key_twice-2'],
      },
      {
        hours: 1,
        ids: ['same_key_twice-3', 'same_key_twice-4'],
      },
    ],
    expected: {
      proposals: [
        {
          hours: 0.0,
          size: 4,
          revisions: 2,
        },
      ],
      joined: 2,
    },
  },
  {
    name: 'lone_alerts_pool',
    why: 'lone alerts with no open proposal share one pooled proposal',
    docs: {
      'lone_alerts_pool-1': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'lone_alerts_pool-2': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\b\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'lone_alerts_pool-3': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\c\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'lone_alerts_pool-4': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\c\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
    },
    batches: [
      {
        hours: 0,
        ids: [
          'lone_alerts_pool-1',
          'lone_alerts_pool-2',
          'lone_alerts_pool-3',
          'lone_alerts_pool-4',
        ],
      },
    ],
    expected: {
      proposals: [
        {
          hours: 0.0,
          size: 2,
          revisions: 1,
        },
        {
          hours: 0.0,
          size: 2,
          revisions: 1,
        },
      ],
      joined: 0,
    },
  },
  {
    name: 'lone_alert_joins',
    why: 'a lone alert whose key has an open proposal joins it instead of pooling',
    docs: {
      'lone_alert_joins-1': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'lone_alert_joins-2': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'lone_alert_joins-3': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'lone_alert_joins-4': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\b\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
    },
    batches: [
      {
        hours: 0,
        ids: ['lone_alert_joins-1', 'lone_alert_joins-2'],
      },
      {
        hours: 2,
        ids: ['lone_alert_joins-3', 'lone_alert_joins-4'],
      },
    ],
    expected: {
      proposals: [
        {
          hours: 0.0,
          size: 3,
          revisions: 2,
        },
        {
          hours: 2.0,
          size: 1,
          revisions: 1,
        },
      ],
      joined: 1,
    },
  },
  {
    name: 'two_rules_one_batch',
    why: 'the same program under two rules is two keys',
    docs: {
      'two_rules_one_batch-1': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'two_rules_one_batch-2': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'two_rules_one_batch-3': {
        'kibana.alert.rule.uuid': 'rule-2',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'two_rules_one_batch-4': {
        'kibana.alert.rule.uuid': 'rule-2',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'two_rules_one_batch-5': {
        'kibana.alert.rule.uuid': 'rule-2',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'two_rules_one_batch-6': {
        'kibana.alert.rule.uuid': 'rule-2',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
    },
    batches: [
      {
        hours: 0,
        ids: [
          'two_rules_one_batch-1',
          'two_rules_one_batch-2',
          'two_rules_one_batch-3',
          'two_rules_one_batch-4',
        ],
      },
      {
        hours: 1,
        ids: ['two_rules_one_batch-5', 'two_rules_one_batch-6'],
      },
    ],
    expected: {
      proposals: [
        {
          hours: 0.0,
          size: 2,
          revisions: 1,
        },
        {
          hours: 0.0,
          size: 4,
          revisions: 2,
        },
      ],
      joined: 2,
    },
  },
  {
    name: 'cloud_fallback',
    why: 'alerts with no identifying field group by rule and detection only',
    docs: {
      'cloud_fallback-1': {
        'kibana.alert.rule.uuid': 'cloud-rule',
        'kibana.alert.rule.revision': 1,
        user: {
          name: 'u1',
        },
      },
      'cloud_fallback-2': {
        'kibana.alert.rule.uuid': 'cloud-rule',
        'kibana.alert.rule.revision': 1,
        user: {
          name: 'u2',
        },
      },
      'cloud_fallback-3': {
        'kibana.alert.rule.uuid': 'cloud-rule',
        'kibana.alert.rule.revision': 1,
        user: {
          name: 'u3',
        },
      },
      'cloud_fallback-4': {
        'kibana.alert.rule.uuid': 'cloud-rule',
        'kibana.alert.rule.revision': 1,
        user: {
          name: 'u4',
        },
      },
      'cloud_fallback-5': {
        'kibana.alert.rule.uuid': 'cloud-rule',
        'kibana.alert.rule.revision': 1,
        user: {
          name: 'u5',
        },
      },
      'cloud_fallback-6': {
        'kibana.alert.rule.uuid': 'cloud-rule-2',
        'kibana.alert.rule.revision': 1,
        user: {
          name: 'u6',
        },
      },
    },
    batches: [
      {
        hours: 0,
        ids: ['cloud_fallback-1', 'cloud_fallback-2', 'cloud_fallback-3'],
      },
      {
        hours: 3,
        ids: ['cloud_fallback-4', 'cloud_fallback-5'],
      },
      {
        hours: 4,
        ids: ['cloud_fallback-6'],
      },
    ],
    expected: {
      proposals: [
        {
          hours: 0.0,
          size: 5,
          revisions: 2,
        },
        {
          hours: 4.0,
          size: 1,
          revisions: 1,
        },
      ],
      joined: 2,
    },
  },
  {
    name: 'join_margin',
    why: 'a proposal takes no join in its last 24 of 72 hours',
    docs: {
      'join_margin-1': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'join_margin-2': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'join_margin-3': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'join_margin-4': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'join_margin-5': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'join_margin-6': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'join_margin-7': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'join_margin-8': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'join_margin-9': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'join_margin-10': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
    },
    batches: [
      {
        hours: 0,
        ids: ['join_margin-1', 'join_margin-2'],
      },
      {
        hours: 47,
        ids: ['join_margin-3', 'join_margin-4'],
      },
      {
        hours: 48,
        ids: ['join_margin-5', 'join_margin-6'],
      },
      {
        hours: 49,
        ids: ['join_margin-7', 'join_margin-8'],
      },
      {
        hours: 125,
        ids: ['join_margin-9', 'join_margin-10'],
      },
    ],
    expected: {
      proposals: [
        {
          hours: 0.0,
          size: 4,
          revisions: 2,
        },
        {
          hours: 48.0,
          size: 4,
          revisions: 2,
        },
        {
          hours: 125.0,
          size: 2,
          revisions: 1,
        },
      ],
      joined: 4,
    },
  },
  {
    name: 'alert_cap',
    why: 'a proposal holds at most 1,000 alerts',
    docs: {
      'alert_cap-1': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-2': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-3': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-4': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-5': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-6': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-7': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-8': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-9': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-10': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-11': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-12': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-13': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-14': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-15': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-16': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-17': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-18': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-19': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-20': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-21': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-22': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-23': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-24': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-25': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-26': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-27': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-28': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-29': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-30': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-31': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-32': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-33': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-34': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-35': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-36': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-37': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-38': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-39': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-40': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-41': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-42': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-43': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-44': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-45': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-46': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-47': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-48': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-49': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-50': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-51': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-52': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-53': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-54': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-55': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-56': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-57': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-58': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-59': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-60': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-61': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-62': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-63': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-64': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-65': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-66': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-67': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-68': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-69': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-70': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-71': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-72': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-73': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-74': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-75': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-76': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-77': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-78': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-79': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-80': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-81': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-82': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-83': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-84': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-85': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-86': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-87': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-88': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-89': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-90': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-91': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-92': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-93': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-94': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-95': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-96': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-97': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-98': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-99': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-100': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-101': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-102': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-103': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-104': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-105': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-106': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-107': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-108': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-109': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-110': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-111': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-112': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-113': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-114': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-115': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-116': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-117': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-118': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-119': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-120': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-121': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-122': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-123': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-124': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-125': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-126': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-127': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-128': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-129': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-130': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-131': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-132': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-133': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-134': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-135': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-136': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-137': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-138': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-139': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-140': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-141': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-142': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-143': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-144': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-145': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-146': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-147': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-148': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-149': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-150': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-151': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-152': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-153': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-154': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-155': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-156': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-157': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-158': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-159': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-160': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-161': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-162': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-163': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-164': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-165': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-166': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-167': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-168': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-169': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-170': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-171': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-172': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-173': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-174': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-175': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-176': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-177': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-178': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-179': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-180': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-181': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-182': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-183': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-184': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-185': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-186': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-187': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-188': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-189': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-190': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-191': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-192': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-193': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-194': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-195': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-196': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-197': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-198': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-199': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-200': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-201': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-202': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-203': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-204': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-205': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-206': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-207': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-208': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-209': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-210': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-211': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-212': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-213': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-214': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-215': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-216': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-217': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-218': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-219': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-220': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-221': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-222': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-223': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-224': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-225': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-226': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-227': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-228': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-229': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-230': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-231': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-232': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-233': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-234': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-235': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-236': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-237': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-238': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-239': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-240': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-241': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-242': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-243': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-244': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-245': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-246': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-247': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-248': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-249': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-250': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-251': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-252': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-253': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-254': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-255': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-256': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-257': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-258': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-259': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-260': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-261': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-262': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-263': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-264': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-265': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-266': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-267': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-268': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-269': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-270': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-271': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-272': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-273': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-274': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-275': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-276': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-277': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-278': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-279': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-280': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-281': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-282': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-283': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-284': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-285': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-286': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-287': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-288': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-289': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-290': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-291': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-292': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-293': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-294': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-295': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-296': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-297': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-298': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-299': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-300': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-301': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-302': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-303': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-304': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-305': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-306': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-307': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-308': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-309': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-310': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-311': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-312': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-313': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-314': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-315': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-316': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-317': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-318': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-319': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-320': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-321': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-322': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-323': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-324': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-325': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-326': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-327': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-328': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-329': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-330': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-331': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-332': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-333': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-334': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-335': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-336': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-337': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-338': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-339': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-340': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-341': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-342': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-343': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-344': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-345': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-346': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-347': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-348': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-349': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-350': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-351': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-352': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-353': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-354': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-355': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-356': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-357': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-358': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-359': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-360': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-361': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-362': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-363': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-364': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-365': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-366': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-367': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-368': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-369': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-370': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-371': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-372': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-373': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-374': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-375': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-376': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-377': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-378': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-379': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-380': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-381': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-382': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-383': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-384': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-385': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-386': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-387': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-388': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-389': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-390': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-391': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-392': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-393': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-394': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-395': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-396': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-397': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-398': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-399': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-400': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-401': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-402': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-403': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-404': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-405': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-406': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-407': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-408': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-409': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-410': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-411': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-412': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-413': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-414': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-415': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-416': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-417': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-418': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-419': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-420': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-421': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-422': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-423': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-424': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-425': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-426': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-427': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-428': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-429': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-430': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-431': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-432': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-433': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-434': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-435': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-436': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-437': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-438': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-439': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-440': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-441': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-442': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-443': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-444': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-445': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-446': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-447': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-448': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-449': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-450': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-451': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-452': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-453': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-454': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-455': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-456': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-457': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-458': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-459': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-460': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-461': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-462': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-463': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-464': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-465': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-466': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-467': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-468': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-469': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-470': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-471': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-472': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-473': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-474': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-475': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-476': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-477': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-478': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-479': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-480': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-481': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-482': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-483': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-484': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-485': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-486': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-487': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-488': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-489': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-490': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-491': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-492': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-493': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-494': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-495': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-496': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-497': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-498': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-499': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-500': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-501': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-502': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-503': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-504': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-505': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-506': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-507': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-508': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-509': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-510': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-511': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-512': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-513': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-514': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-515': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-516': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-517': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-518': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-519': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-520': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-521': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-522': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-523': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-524': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-525': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-526': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-527': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-528': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-529': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-530': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-531': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-532': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-533': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-534': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-535': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-536': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-537': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-538': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-539': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-540': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-541': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-542': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-543': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-544': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-545': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-546': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-547': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-548': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-549': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-550': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-551': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-552': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-553': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-554': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-555': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-556': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-557': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-558': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-559': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-560': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-561': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-562': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-563': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-564': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-565': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-566': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-567': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-568': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-569': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-570': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-571': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-572': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-573': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-574': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-575': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-576': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-577': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-578': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-579': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-580': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-581': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-582': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-583': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-584': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-585': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-586': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-587': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-588': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-589': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-590': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-591': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-592': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-593': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-594': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-595': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-596': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-597': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-598': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-599': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-600': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-601': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-602': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-603': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-604': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-605': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-606': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-607': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-608': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-609': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-610': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-611': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-612': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-613': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-614': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-615': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-616': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-617': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-618': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-619': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-620': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-621': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-622': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-623': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-624': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-625': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-626': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-627': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-628': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-629': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-630': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-631': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-632': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-633': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-634': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-635': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-636': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-637': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-638': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-639': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-640': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-641': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-642': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-643': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-644': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-645': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-646': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-647': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-648': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-649': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-650': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-651': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-652': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-653': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-654': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-655': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-656': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-657': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-658': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-659': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-660': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-661': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-662': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-663': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-664': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-665': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-666': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-667': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-668': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-669': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-670': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-671': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-672': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-673': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-674': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-675': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-676': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-677': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-678': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-679': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-680': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-681': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-682': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-683': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-684': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-685': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-686': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-687': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-688': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-689': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-690': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-691': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-692': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-693': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-694': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-695': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-696': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-697': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-698': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-699': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-700': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-701': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-702': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-703': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-704': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-705': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-706': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-707': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-708': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-709': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-710': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-711': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-712': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-713': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-714': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-715': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-716': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-717': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-718': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-719': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-720': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-721': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-722': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-723': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-724': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-725': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-726': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-727': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-728': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-729': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-730': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-731': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-732': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-733': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-734': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-735': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-736': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-737': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-738': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-739': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-740': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-741': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-742': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-743': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-744': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-745': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-746': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-747': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-748': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-749': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-750': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-751': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-752': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-753': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-754': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-755': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-756': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-757': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-758': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-759': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-760': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-761': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-762': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-763': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-764': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-765': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-766': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-767': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-768': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-769': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-770': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-771': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-772': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-773': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-774': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-775': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-776': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-777': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-778': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-779': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-780': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-781': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-782': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-783': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-784': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-785': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-786': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-787': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-788': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-789': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-790': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-791': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-792': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-793': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-794': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-795': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-796': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-797': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-798': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-799': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-800': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-801': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-802': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-803': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-804': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-805': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-806': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-807': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-808': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-809': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-810': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-811': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-812': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-813': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-814': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-815': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-816': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-817': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-818': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-819': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-820': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-821': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-822': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-823': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-824': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-825': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-826': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-827': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-828': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-829': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-830': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-831': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-832': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-833': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-834': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-835': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-836': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-837': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-838': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-839': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-840': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-841': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-842': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-843': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-844': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-845': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-846': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-847': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-848': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-849': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-850': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-851': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-852': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-853': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-854': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-855': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-856': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-857': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-858': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-859': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-860': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-861': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-862': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-863': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-864': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-865': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-866': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-867': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-868': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-869': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-870': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-871': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-872': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-873': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-874': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-875': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-876': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-877': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-878': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-879': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-880': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-881': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-882': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-883': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-884': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-885': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-886': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-887': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-888': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-889': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-890': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-891': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-892': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-893': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-894': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-895': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-896': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-897': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-898': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-899': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-900': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-901': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-902': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-903': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-904': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-905': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-906': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-907': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-908': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-909': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-910': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-911': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-912': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-913': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-914': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-915': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-916': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-917': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-918': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-919': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-920': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-921': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-922': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-923': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-924': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-925': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-926': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-927': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-928': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-929': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-930': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-931': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-932': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-933': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-934': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-935': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-936': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-937': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-938': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-939': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-940': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-941': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-942': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-943': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-944': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-945': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-946': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-947': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-948': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-949': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-950': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-951': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-952': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-953': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-954': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-955': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-956': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-957': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-958': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-959': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-960': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-961': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-962': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-963': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-964': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-965': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-966': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-967': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-968': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-969': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-970': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-971': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-972': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-973': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-974': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-975': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-976': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-977': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-978': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-979': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-980': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-981': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-982': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-983': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-984': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-985': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-986': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-987': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-988': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-989': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-990': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-991': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-992': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-993': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-994': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-995': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-996': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-997': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-998': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-999': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1000': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1001': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1002': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1003': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1004': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1005': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1006': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1007': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1008': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1009': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1010': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1011': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1012': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1013': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1014': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1015': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1016': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1017': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1018': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1019': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1020': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1021': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1022': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1023': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1024': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1025': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1026': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1027': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1028': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1029': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1030': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1031': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1032': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1033': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1034': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1035': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1036': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1037': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1038': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1039': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1040': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1041': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1042': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1043': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1044': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1045': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1046': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1047': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1048': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1049': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1050': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1051': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1052': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1053': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1054': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1055': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1056': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1057': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1058': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1059': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1060': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1061': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1062': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1063': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1064': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1065': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1066': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1067': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1068': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1069': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1070': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1071': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1072': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1073': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1074': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1075': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1076': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1077': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1078': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1079': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1080': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1081': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1082': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1083': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1084': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1085': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1086': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1087': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1088': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1089': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1090': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1091': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1092': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1093': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1094': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1095': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1096': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1097': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1098': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1099': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1100': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1101': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1102': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1103': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1104': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1105': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1106': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1107': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1108': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1109': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1110': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1111': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1112': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1113': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1114': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1115': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1116': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1117': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1118': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1119': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1120': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1121': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1122': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1123': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1124': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1125': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1126': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1127': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1128': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1129': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1130': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1131': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1132': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1133': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1134': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1135': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1136': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1137': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1138': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1139': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1140': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1141': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1142': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1143': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1144': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1145': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1146': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1147': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1148': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1149': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1150': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1151': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1152': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1153': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1154': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1155': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1156': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1157': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1158': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1159': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1160': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1161': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1162': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1163': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1164': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1165': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1166': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1167': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1168': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1169': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1170': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1171': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1172': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1173': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1174': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1175': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1176': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1177': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1178': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1179': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1180': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1181': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1182': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1183': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1184': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1185': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1186': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1187': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1188': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1189': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1190': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1191': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1192': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1193': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1194': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1195': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1196': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1197': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1198': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1199': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'alert_cap-1200': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
    },
    batches: [
      {
        hours: 0,
        ids: [
          'alert_cap-1',
          'alert_cap-2',
          'alert_cap-3',
          'alert_cap-4',
          'alert_cap-5',
          'alert_cap-6',
          'alert_cap-7',
          'alert_cap-8',
          'alert_cap-9',
          'alert_cap-10',
          'alert_cap-11',
          'alert_cap-12',
          'alert_cap-13',
          'alert_cap-14',
          'alert_cap-15',
          'alert_cap-16',
          'alert_cap-17',
          'alert_cap-18',
          'alert_cap-19',
          'alert_cap-20',
          'alert_cap-21',
          'alert_cap-22',
          'alert_cap-23',
          'alert_cap-24',
          'alert_cap-25',
          'alert_cap-26',
          'alert_cap-27',
          'alert_cap-28',
          'alert_cap-29',
          'alert_cap-30',
          'alert_cap-31',
          'alert_cap-32',
          'alert_cap-33',
          'alert_cap-34',
          'alert_cap-35',
          'alert_cap-36',
          'alert_cap-37',
          'alert_cap-38',
          'alert_cap-39',
          'alert_cap-40',
          'alert_cap-41',
          'alert_cap-42',
          'alert_cap-43',
          'alert_cap-44',
          'alert_cap-45',
          'alert_cap-46',
          'alert_cap-47',
          'alert_cap-48',
          'alert_cap-49',
          'alert_cap-50',
          'alert_cap-51',
          'alert_cap-52',
          'alert_cap-53',
          'alert_cap-54',
          'alert_cap-55',
          'alert_cap-56',
          'alert_cap-57',
          'alert_cap-58',
          'alert_cap-59',
          'alert_cap-60',
          'alert_cap-61',
          'alert_cap-62',
          'alert_cap-63',
          'alert_cap-64',
          'alert_cap-65',
          'alert_cap-66',
          'alert_cap-67',
          'alert_cap-68',
          'alert_cap-69',
          'alert_cap-70',
          'alert_cap-71',
          'alert_cap-72',
          'alert_cap-73',
          'alert_cap-74',
          'alert_cap-75',
          'alert_cap-76',
          'alert_cap-77',
          'alert_cap-78',
          'alert_cap-79',
          'alert_cap-80',
          'alert_cap-81',
          'alert_cap-82',
          'alert_cap-83',
          'alert_cap-84',
          'alert_cap-85',
          'alert_cap-86',
          'alert_cap-87',
          'alert_cap-88',
          'alert_cap-89',
          'alert_cap-90',
          'alert_cap-91',
          'alert_cap-92',
          'alert_cap-93',
          'alert_cap-94',
          'alert_cap-95',
          'alert_cap-96',
          'alert_cap-97',
          'alert_cap-98',
          'alert_cap-99',
          'alert_cap-100',
        ],
      },
      {
        hours: 1,
        ids: [
          'alert_cap-101',
          'alert_cap-102',
          'alert_cap-103',
          'alert_cap-104',
          'alert_cap-105',
          'alert_cap-106',
          'alert_cap-107',
          'alert_cap-108',
          'alert_cap-109',
          'alert_cap-110',
          'alert_cap-111',
          'alert_cap-112',
          'alert_cap-113',
          'alert_cap-114',
          'alert_cap-115',
          'alert_cap-116',
          'alert_cap-117',
          'alert_cap-118',
          'alert_cap-119',
          'alert_cap-120',
          'alert_cap-121',
          'alert_cap-122',
          'alert_cap-123',
          'alert_cap-124',
          'alert_cap-125',
          'alert_cap-126',
          'alert_cap-127',
          'alert_cap-128',
          'alert_cap-129',
          'alert_cap-130',
          'alert_cap-131',
          'alert_cap-132',
          'alert_cap-133',
          'alert_cap-134',
          'alert_cap-135',
          'alert_cap-136',
          'alert_cap-137',
          'alert_cap-138',
          'alert_cap-139',
          'alert_cap-140',
          'alert_cap-141',
          'alert_cap-142',
          'alert_cap-143',
          'alert_cap-144',
          'alert_cap-145',
          'alert_cap-146',
          'alert_cap-147',
          'alert_cap-148',
          'alert_cap-149',
          'alert_cap-150',
          'alert_cap-151',
          'alert_cap-152',
          'alert_cap-153',
          'alert_cap-154',
          'alert_cap-155',
          'alert_cap-156',
          'alert_cap-157',
          'alert_cap-158',
          'alert_cap-159',
          'alert_cap-160',
          'alert_cap-161',
          'alert_cap-162',
          'alert_cap-163',
          'alert_cap-164',
          'alert_cap-165',
          'alert_cap-166',
          'alert_cap-167',
          'alert_cap-168',
          'alert_cap-169',
          'alert_cap-170',
          'alert_cap-171',
          'alert_cap-172',
          'alert_cap-173',
          'alert_cap-174',
          'alert_cap-175',
          'alert_cap-176',
          'alert_cap-177',
          'alert_cap-178',
          'alert_cap-179',
          'alert_cap-180',
          'alert_cap-181',
          'alert_cap-182',
          'alert_cap-183',
          'alert_cap-184',
          'alert_cap-185',
          'alert_cap-186',
          'alert_cap-187',
          'alert_cap-188',
          'alert_cap-189',
          'alert_cap-190',
          'alert_cap-191',
          'alert_cap-192',
          'alert_cap-193',
          'alert_cap-194',
          'alert_cap-195',
          'alert_cap-196',
          'alert_cap-197',
          'alert_cap-198',
          'alert_cap-199',
          'alert_cap-200',
        ],
      },
      {
        hours: 2,
        ids: [
          'alert_cap-201',
          'alert_cap-202',
          'alert_cap-203',
          'alert_cap-204',
          'alert_cap-205',
          'alert_cap-206',
          'alert_cap-207',
          'alert_cap-208',
          'alert_cap-209',
          'alert_cap-210',
          'alert_cap-211',
          'alert_cap-212',
          'alert_cap-213',
          'alert_cap-214',
          'alert_cap-215',
          'alert_cap-216',
          'alert_cap-217',
          'alert_cap-218',
          'alert_cap-219',
          'alert_cap-220',
          'alert_cap-221',
          'alert_cap-222',
          'alert_cap-223',
          'alert_cap-224',
          'alert_cap-225',
          'alert_cap-226',
          'alert_cap-227',
          'alert_cap-228',
          'alert_cap-229',
          'alert_cap-230',
          'alert_cap-231',
          'alert_cap-232',
          'alert_cap-233',
          'alert_cap-234',
          'alert_cap-235',
          'alert_cap-236',
          'alert_cap-237',
          'alert_cap-238',
          'alert_cap-239',
          'alert_cap-240',
          'alert_cap-241',
          'alert_cap-242',
          'alert_cap-243',
          'alert_cap-244',
          'alert_cap-245',
          'alert_cap-246',
          'alert_cap-247',
          'alert_cap-248',
          'alert_cap-249',
          'alert_cap-250',
          'alert_cap-251',
          'alert_cap-252',
          'alert_cap-253',
          'alert_cap-254',
          'alert_cap-255',
          'alert_cap-256',
          'alert_cap-257',
          'alert_cap-258',
          'alert_cap-259',
          'alert_cap-260',
          'alert_cap-261',
          'alert_cap-262',
          'alert_cap-263',
          'alert_cap-264',
          'alert_cap-265',
          'alert_cap-266',
          'alert_cap-267',
          'alert_cap-268',
          'alert_cap-269',
          'alert_cap-270',
          'alert_cap-271',
          'alert_cap-272',
          'alert_cap-273',
          'alert_cap-274',
          'alert_cap-275',
          'alert_cap-276',
          'alert_cap-277',
          'alert_cap-278',
          'alert_cap-279',
          'alert_cap-280',
          'alert_cap-281',
          'alert_cap-282',
          'alert_cap-283',
          'alert_cap-284',
          'alert_cap-285',
          'alert_cap-286',
          'alert_cap-287',
          'alert_cap-288',
          'alert_cap-289',
          'alert_cap-290',
          'alert_cap-291',
          'alert_cap-292',
          'alert_cap-293',
          'alert_cap-294',
          'alert_cap-295',
          'alert_cap-296',
          'alert_cap-297',
          'alert_cap-298',
          'alert_cap-299',
          'alert_cap-300',
        ],
      },
      {
        hours: 3,
        ids: [
          'alert_cap-301',
          'alert_cap-302',
          'alert_cap-303',
          'alert_cap-304',
          'alert_cap-305',
          'alert_cap-306',
          'alert_cap-307',
          'alert_cap-308',
          'alert_cap-309',
          'alert_cap-310',
          'alert_cap-311',
          'alert_cap-312',
          'alert_cap-313',
          'alert_cap-314',
          'alert_cap-315',
          'alert_cap-316',
          'alert_cap-317',
          'alert_cap-318',
          'alert_cap-319',
          'alert_cap-320',
          'alert_cap-321',
          'alert_cap-322',
          'alert_cap-323',
          'alert_cap-324',
          'alert_cap-325',
          'alert_cap-326',
          'alert_cap-327',
          'alert_cap-328',
          'alert_cap-329',
          'alert_cap-330',
          'alert_cap-331',
          'alert_cap-332',
          'alert_cap-333',
          'alert_cap-334',
          'alert_cap-335',
          'alert_cap-336',
          'alert_cap-337',
          'alert_cap-338',
          'alert_cap-339',
          'alert_cap-340',
          'alert_cap-341',
          'alert_cap-342',
          'alert_cap-343',
          'alert_cap-344',
          'alert_cap-345',
          'alert_cap-346',
          'alert_cap-347',
          'alert_cap-348',
          'alert_cap-349',
          'alert_cap-350',
          'alert_cap-351',
          'alert_cap-352',
          'alert_cap-353',
          'alert_cap-354',
          'alert_cap-355',
          'alert_cap-356',
          'alert_cap-357',
          'alert_cap-358',
          'alert_cap-359',
          'alert_cap-360',
          'alert_cap-361',
          'alert_cap-362',
          'alert_cap-363',
          'alert_cap-364',
          'alert_cap-365',
          'alert_cap-366',
          'alert_cap-367',
          'alert_cap-368',
          'alert_cap-369',
          'alert_cap-370',
          'alert_cap-371',
          'alert_cap-372',
          'alert_cap-373',
          'alert_cap-374',
          'alert_cap-375',
          'alert_cap-376',
          'alert_cap-377',
          'alert_cap-378',
          'alert_cap-379',
          'alert_cap-380',
          'alert_cap-381',
          'alert_cap-382',
          'alert_cap-383',
          'alert_cap-384',
          'alert_cap-385',
          'alert_cap-386',
          'alert_cap-387',
          'alert_cap-388',
          'alert_cap-389',
          'alert_cap-390',
          'alert_cap-391',
          'alert_cap-392',
          'alert_cap-393',
          'alert_cap-394',
          'alert_cap-395',
          'alert_cap-396',
          'alert_cap-397',
          'alert_cap-398',
          'alert_cap-399',
          'alert_cap-400',
        ],
      },
      {
        hours: 4,
        ids: [
          'alert_cap-401',
          'alert_cap-402',
          'alert_cap-403',
          'alert_cap-404',
          'alert_cap-405',
          'alert_cap-406',
          'alert_cap-407',
          'alert_cap-408',
          'alert_cap-409',
          'alert_cap-410',
          'alert_cap-411',
          'alert_cap-412',
          'alert_cap-413',
          'alert_cap-414',
          'alert_cap-415',
          'alert_cap-416',
          'alert_cap-417',
          'alert_cap-418',
          'alert_cap-419',
          'alert_cap-420',
          'alert_cap-421',
          'alert_cap-422',
          'alert_cap-423',
          'alert_cap-424',
          'alert_cap-425',
          'alert_cap-426',
          'alert_cap-427',
          'alert_cap-428',
          'alert_cap-429',
          'alert_cap-430',
          'alert_cap-431',
          'alert_cap-432',
          'alert_cap-433',
          'alert_cap-434',
          'alert_cap-435',
          'alert_cap-436',
          'alert_cap-437',
          'alert_cap-438',
          'alert_cap-439',
          'alert_cap-440',
          'alert_cap-441',
          'alert_cap-442',
          'alert_cap-443',
          'alert_cap-444',
          'alert_cap-445',
          'alert_cap-446',
          'alert_cap-447',
          'alert_cap-448',
          'alert_cap-449',
          'alert_cap-450',
          'alert_cap-451',
          'alert_cap-452',
          'alert_cap-453',
          'alert_cap-454',
          'alert_cap-455',
          'alert_cap-456',
          'alert_cap-457',
          'alert_cap-458',
          'alert_cap-459',
          'alert_cap-460',
          'alert_cap-461',
          'alert_cap-462',
          'alert_cap-463',
          'alert_cap-464',
          'alert_cap-465',
          'alert_cap-466',
          'alert_cap-467',
          'alert_cap-468',
          'alert_cap-469',
          'alert_cap-470',
          'alert_cap-471',
          'alert_cap-472',
          'alert_cap-473',
          'alert_cap-474',
          'alert_cap-475',
          'alert_cap-476',
          'alert_cap-477',
          'alert_cap-478',
          'alert_cap-479',
          'alert_cap-480',
          'alert_cap-481',
          'alert_cap-482',
          'alert_cap-483',
          'alert_cap-484',
          'alert_cap-485',
          'alert_cap-486',
          'alert_cap-487',
          'alert_cap-488',
          'alert_cap-489',
          'alert_cap-490',
          'alert_cap-491',
          'alert_cap-492',
          'alert_cap-493',
          'alert_cap-494',
          'alert_cap-495',
          'alert_cap-496',
          'alert_cap-497',
          'alert_cap-498',
          'alert_cap-499',
          'alert_cap-500',
        ],
      },
      {
        hours: 5,
        ids: [
          'alert_cap-501',
          'alert_cap-502',
          'alert_cap-503',
          'alert_cap-504',
          'alert_cap-505',
          'alert_cap-506',
          'alert_cap-507',
          'alert_cap-508',
          'alert_cap-509',
          'alert_cap-510',
          'alert_cap-511',
          'alert_cap-512',
          'alert_cap-513',
          'alert_cap-514',
          'alert_cap-515',
          'alert_cap-516',
          'alert_cap-517',
          'alert_cap-518',
          'alert_cap-519',
          'alert_cap-520',
          'alert_cap-521',
          'alert_cap-522',
          'alert_cap-523',
          'alert_cap-524',
          'alert_cap-525',
          'alert_cap-526',
          'alert_cap-527',
          'alert_cap-528',
          'alert_cap-529',
          'alert_cap-530',
          'alert_cap-531',
          'alert_cap-532',
          'alert_cap-533',
          'alert_cap-534',
          'alert_cap-535',
          'alert_cap-536',
          'alert_cap-537',
          'alert_cap-538',
          'alert_cap-539',
          'alert_cap-540',
          'alert_cap-541',
          'alert_cap-542',
          'alert_cap-543',
          'alert_cap-544',
          'alert_cap-545',
          'alert_cap-546',
          'alert_cap-547',
          'alert_cap-548',
          'alert_cap-549',
          'alert_cap-550',
          'alert_cap-551',
          'alert_cap-552',
          'alert_cap-553',
          'alert_cap-554',
          'alert_cap-555',
          'alert_cap-556',
          'alert_cap-557',
          'alert_cap-558',
          'alert_cap-559',
          'alert_cap-560',
          'alert_cap-561',
          'alert_cap-562',
          'alert_cap-563',
          'alert_cap-564',
          'alert_cap-565',
          'alert_cap-566',
          'alert_cap-567',
          'alert_cap-568',
          'alert_cap-569',
          'alert_cap-570',
          'alert_cap-571',
          'alert_cap-572',
          'alert_cap-573',
          'alert_cap-574',
          'alert_cap-575',
          'alert_cap-576',
          'alert_cap-577',
          'alert_cap-578',
          'alert_cap-579',
          'alert_cap-580',
          'alert_cap-581',
          'alert_cap-582',
          'alert_cap-583',
          'alert_cap-584',
          'alert_cap-585',
          'alert_cap-586',
          'alert_cap-587',
          'alert_cap-588',
          'alert_cap-589',
          'alert_cap-590',
          'alert_cap-591',
          'alert_cap-592',
          'alert_cap-593',
          'alert_cap-594',
          'alert_cap-595',
          'alert_cap-596',
          'alert_cap-597',
          'alert_cap-598',
          'alert_cap-599',
          'alert_cap-600',
        ],
      },
      {
        hours: 6,
        ids: [
          'alert_cap-601',
          'alert_cap-602',
          'alert_cap-603',
          'alert_cap-604',
          'alert_cap-605',
          'alert_cap-606',
          'alert_cap-607',
          'alert_cap-608',
          'alert_cap-609',
          'alert_cap-610',
          'alert_cap-611',
          'alert_cap-612',
          'alert_cap-613',
          'alert_cap-614',
          'alert_cap-615',
          'alert_cap-616',
          'alert_cap-617',
          'alert_cap-618',
          'alert_cap-619',
          'alert_cap-620',
          'alert_cap-621',
          'alert_cap-622',
          'alert_cap-623',
          'alert_cap-624',
          'alert_cap-625',
          'alert_cap-626',
          'alert_cap-627',
          'alert_cap-628',
          'alert_cap-629',
          'alert_cap-630',
          'alert_cap-631',
          'alert_cap-632',
          'alert_cap-633',
          'alert_cap-634',
          'alert_cap-635',
          'alert_cap-636',
          'alert_cap-637',
          'alert_cap-638',
          'alert_cap-639',
          'alert_cap-640',
          'alert_cap-641',
          'alert_cap-642',
          'alert_cap-643',
          'alert_cap-644',
          'alert_cap-645',
          'alert_cap-646',
          'alert_cap-647',
          'alert_cap-648',
          'alert_cap-649',
          'alert_cap-650',
          'alert_cap-651',
          'alert_cap-652',
          'alert_cap-653',
          'alert_cap-654',
          'alert_cap-655',
          'alert_cap-656',
          'alert_cap-657',
          'alert_cap-658',
          'alert_cap-659',
          'alert_cap-660',
          'alert_cap-661',
          'alert_cap-662',
          'alert_cap-663',
          'alert_cap-664',
          'alert_cap-665',
          'alert_cap-666',
          'alert_cap-667',
          'alert_cap-668',
          'alert_cap-669',
          'alert_cap-670',
          'alert_cap-671',
          'alert_cap-672',
          'alert_cap-673',
          'alert_cap-674',
          'alert_cap-675',
          'alert_cap-676',
          'alert_cap-677',
          'alert_cap-678',
          'alert_cap-679',
          'alert_cap-680',
          'alert_cap-681',
          'alert_cap-682',
          'alert_cap-683',
          'alert_cap-684',
          'alert_cap-685',
          'alert_cap-686',
          'alert_cap-687',
          'alert_cap-688',
          'alert_cap-689',
          'alert_cap-690',
          'alert_cap-691',
          'alert_cap-692',
          'alert_cap-693',
          'alert_cap-694',
          'alert_cap-695',
          'alert_cap-696',
          'alert_cap-697',
          'alert_cap-698',
          'alert_cap-699',
          'alert_cap-700',
        ],
      },
      {
        hours: 7,
        ids: [
          'alert_cap-701',
          'alert_cap-702',
          'alert_cap-703',
          'alert_cap-704',
          'alert_cap-705',
          'alert_cap-706',
          'alert_cap-707',
          'alert_cap-708',
          'alert_cap-709',
          'alert_cap-710',
          'alert_cap-711',
          'alert_cap-712',
          'alert_cap-713',
          'alert_cap-714',
          'alert_cap-715',
          'alert_cap-716',
          'alert_cap-717',
          'alert_cap-718',
          'alert_cap-719',
          'alert_cap-720',
          'alert_cap-721',
          'alert_cap-722',
          'alert_cap-723',
          'alert_cap-724',
          'alert_cap-725',
          'alert_cap-726',
          'alert_cap-727',
          'alert_cap-728',
          'alert_cap-729',
          'alert_cap-730',
          'alert_cap-731',
          'alert_cap-732',
          'alert_cap-733',
          'alert_cap-734',
          'alert_cap-735',
          'alert_cap-736',
          'alert_cap-737',
          'alert_cap-738',
          'alert_cap-739',
          'alert_cap-740',
          'alert_cap-741',
          'alert_cap-742',
          'alert_cap-743',
          'alert_cap-744',
          'alert_cap-745',
          'alert_cap-746',
          'alert_cap-747',
          'alert_cap-748',
          'alert_cap-749',
          'alert_cap-750',
          'alert_cap-751',
          'alert_cap-752',
          'alert_cap-753',
          'alert_cap-754',
          'alert_cap-755',
          'alert_cap-756',
          'alert_cap-757',
          'alert_cap-758',
          'alert_cap-759',
          'alert_cap-760',
          'alert_cap-761',
          'alert_cap-762',
          'alert_cap-763',
          'alert_cap-764',
          'alert_cap-765',
          'alert_cap-766',
          'alert_cap-767',
          'alert_cap-768',
          'alert_cap-769',
          'alert_cap-770',
          'alert_cap-771',
          'alert_cap-772',
          'alert_cap-773',
          'alert_cap-774',
          'alert_cap-775',
          'alert_cap-776',
          'alert_cap-777',
          'alert_cap-778',
          'alert_cap-779',
          'alert_cap-780',
          'alert_cap-781',
          'alert_cap-782',
          'alert_cap-783',
          'alert_cap-784',
          'alert_cap-785',
          'alert_cap-786',
          'alert_cap-787',
          'alert_cap-788',
          'alert_cap-789',
          'alert_cap-790',
          'alert_cap-791',
          'alert_cap-792',
          'alert_cap-793',
          'alert_cap-794',
          'alert_cap-795',
          'alert_cap-796',
          'alert_cap-797',
          'alert_cap-798',
          'alert_cap-799',
          'alert_cap-800',
        ],
      },
      {
        hours: 8,
        ids: [
          'alert_cap-801',
          'alert_cap-802',
          'alert_cap-803',
          'alert_cap-804',
          'alert_cap-805',
          'alert_cap-806',
          'alert_cap-807',
          'alert_cap-808',
          'alert_cap-809',
          'alert_cap-810',
          'alert_cap-811',
          'alert_cap-812',
          'alert_cap-813',
          'alert_cap-814',
          'alert_cap-815',
          'alert_cap-816',
          'alert_cap-817',
          'alert_cap-818',
          'alert_cap-819',
          'alert_cap-820',
          'alert_cap-821',
          'alert_cap-822',
          'alert_cap-823',
          'alert_cap-824',
          'alert_cap-825',
          'alert_cap-826',
          'alert_cap-827',
          'alert_cap-828',
          'alert_cap-829',
          'alert_cap-830',
          'alert_cap-831',
          'alert_cap-832',
          'alert_cap-833',
          'alert_cap-834',
          'alert_cap-835',
          'alert_cap-836',
          'alert_cap-837',
          'alert_cap-838',
          'alert_cap-839',
          'alert_cap-840',
          'alert_cap-841',
          'alert_cap-842',
          'alert_cap-843',
          'alert_cap-844',
          'alert_cap-845',
          'alert_cap-846',
          'alert_cap-847',
          'alert_cap-848',
          'alert_cap-849',
          'alert_cap-850',
          'alert_cap-851',
          'alert_cap-852',
          'alert_cap-853',
          'alert_cap-854',
          'alert_cap-855',
          'alert_cap-856',
          'alert_cap-857',
          'alert_cap-858',
          'alert_cap-859',
          'alert_cap-860',
          'alert_cap-861',
          'alert_cap-862',
          'alert_cap-863',
          'alert_cap-864',
          'alert_cap-865',
          'alert_cap-866',
          'alert_cap-867',
          'alert_cap-868',
          'alert_cap-869',
          'alert_cap-870',
          'alert_cap-871',
          'alert_cap-872',
          'alert_cap-873',
          'alert_cap-874',
          'alert_cap-875',
          'alert_cap-876',
          'alert_cap-877',
          'alert_cap-878',
          'alert_cap-879',
          'alert_cap-880',
          'alert_cap-881',
          'alert_cap-882',
          'alert_cap-883',
          'alert_cap-884',
          'alert_cap-885',
          'alert_cap-886',
          'alert_cap-887',
          'alert_cap-888',
          'alert_cap-889',
          'alert_cap-890',
          'alert_cap-891',
          'alert_cap-892',
          'alert_cap-893',
          'alert_cap-894',
          'alert_cap-895',
          'alert_cap-896',
          'alert_cap-897',
          'alert_cap-898',
          'alert_cap-899',
          'alert_cap-900',
        ],
      },
      {
        hours: 9,
        ids: [
          'alert_cap-901',
          'alert_cap-902',
          'alert_cap-903',
          'alert_cap-904',
          'alert_cap-905',
          'alert_cap-906',
          'alert_cap-907',
          'alert_cap-908',
          'alert_cap-909',
          'alert_cap-910',
          'alert_cap-911',
          'alert_cap-912',
          'alert_cap-913',
          'alert_cap-914',
          'alert_cap-915',
          'alert_cap-916',
          'alert_cap-917',
          'alert_cap-918',
          'alert_cap-919',
          'alert_cap-920',
          'alert_cap-921',
          'alert_cap-922',
          'alert_cap-923',
          'alert_cap-924',
          'alert_cap-925',
          'alert_cap-926',
          'alert_cap-927',
          'alert_cap-928',
          'alert_cap-929',
          'alert_cap-930',
          'alert_cap-931',
          'alert_cap-932',
          'alert_cap-933',
          'alert_cap-934',
          'alert_cap-935',
          'alert_cap-936',
          'alert_cap-937',
          'alert_cap-938',
          'alert_cap-939',
          'alert_cap-940',
          'alert_cap-941',
          'alert_cap-942',
          'alert_cap-943',
          'alert_cap-944',
          'alert_cap-945',
          'alert_cap-946',
          'alert_cap-947',
          'alert_cap-948',
          'alert_cap-949',
          'alert_cap-950',
          'alert_cap-951',
          'alert_cap-952',
          'alert_cap-953',
          'alert_cap-954',
          'alert_cap-955',
          'alert_cap-956',
          'alert_cap-957',
          'alert_cap-958',
          'alert_cap-959',
          'alert_cap-960',
          'alert_cap-961',
          'alert_cap-962',
          'alert_cap-963',
          'alert_cap-964',
          'alert_cap-965',
          'alert_cap-966',
          'alert_cap-967',
          'alert_cap-968',
          'alert_cap-969',
          'alert_cap-970',
          'alert_cap-971',
          'alert_cap-972',
          'alert_cap-973',
          'alert_cap-974',
          'alert_cap-975',
          'alert_cap-976',
          'alert_cap-977',
          'alert_cap-978',
          'alert_cap-979',
          'alert_cap-980',
          'alert_cap-981',
          'alert_cap-982',
          'alert_cap-983',
          'alert_cap-984',
          'alert_cap-985',
          'alert_cap-986',
          'alert_cap-987',
          'alert_cap-988',
          'alert_cap-989',
          'alert_cap-990',
          'alert_cap-991',
          'alert_cap-992',
          'alert_cap-993',
          'alert_cap-994',
          'alert_cap-995',
          'alert_cap-996',
          'alert_cap-997',
          'alert_cap-998',
          'alert_cap-999',
          'alert_cap-1000',
        ],
      },
      {
        hours: 10,
        ids: [
          'alert_cap-1001',
          'alert_cap-1002',
          'alert_cap-1003',
          'alert_cap-1004',
          'alert_cap-1005',
          'alert_cap-1006',
          'alert_cap-1007',
          'alert_cap-1008',
          'alert_cap-1009',
          'alert_cap-1010',
          'alert_cap-1011',
          'alert_cap-1012',
          'alert_cap-1013',
          'alert_cap-1014',
          'alert_cap-1015',
          'alert_cap-1016',
          'alert_cap-1017',
          'alert_cap-1018',
          'alert_cap-1019',
          'alert_cap-1020',
          'alert_cap-1021',
          'alert_cap-1022',
          'alert_cap-1023',
          'alert_cap-1024',
          'alert_cap-1025',
          'alert_cap-1026',
          'alert_cap-1027',
          'alert_cap-1028',
          'alert_cap-1029',
          'alert_cap-1030',
          'alert_cap-1031',
          'alert_cap-1032',
          'alert_cap-1033',
          'alert_cap-1034',
          'alert_cap-1035',
          'alert_cap-1036',
          'alert_cap-1037',
          'alert_cap-1038',
          'alert_cap-1039',
          'alert_cap-1040',
          'alert_cap-1041',
          'alert_cap-1042',
          'alert_cap-1043',
          'alert_cap-1044',
          'alert_cap-1045',
          'alert_cap-1046',
          'alert_cap-1047',
          'alert_cap-1048',
          'alert_cap-1049',
          'alert_cap-1050',
          'alert_cap-1051',
          'alert_cap-1052',
          'alert_cap-1053',
          'alert_cap-1054',
          'alert_cap-1055',
          'alert_cap-1056',
          'alert_cap-1057',
          'alert_cap-1058',
          'alert_cap-1059',
          'alert_cap-1060',
          'alert_cap-1061',
          'alert_cap-1062',
          'alert_cap-1063',
          'alert_cap-1064',
          'alert_cap-1065',
          'alert_cap-1066',
          'alert_cap-1067',
          'alert_cap-1068',
          'alert_cap-1069',
          'alert_cap-1070',
          'alert_cap-1071',
          'alert_cap-1072',
          'alert_cap-1073',
          'alert_cap-1074',
          'alert_cap-1075',
          'alert_cap-1076',
          'alert_cap-1077',
          'alert_cap-1078',
          'alert_cap-1079',
          'alert_cap-1080',
          'alert_cap-1081',
          'alert_cap-1082',
          'alert_cap-1083',
          'alert_cap-1084',
          'alert_cap-1085',
          'alert_cap-1086',
          'alert_cap-1087',
          'alert_cap-1088',
          'alert_cap-1089',
          'alert_cap-1090',
          'alert_cap-1091',
          'alert_cap-1092',
          'alert_cap-1093',
          'alert_cap-1094',
          'alert_cap-1095',
          'alert_cap-1096',
          'alert_cap-1097',
          'alert_cap-1098',
          'alert_cap-1099',
          'alert_cap-1100',
        ],
      },
      {
        hours: 11,
        ids: [
          'alert_cap-1101',
          'alert_cap-1102',
          'alert_cap-1103',
          'alert_cap-1104',
          'alert_cap-1105',
          'alert_cap-1106',
          'alert_cap-1107',
          'alert_cap-1108',
          'alert_cap-1109',
          'alert_cap-1110',
          'alert_cap-1111',
          'alert_cap-1112',
          'alert_cap-1113',
          'alert_cap-1114',
          'alert_cap-1115',
          'alert_cap-1116',
          'alert_cap-1117',
          'alert_cap-1118',
          'alert_cap-1119',
          'alert_cap-1120',
          'alert_cap-1121',
          'alert_cap-1122',
          'alert_cap-1123',
          'alert_cap-1124',
          'alert_cap-1125',
          'alert_cap-1126',
          'alert_cap-1127',
          'alert_cap-1128',
          'alert_cap-1129',
          'alert_cap-1130',
          'alert_cap-1131',
          'alert_cap-1132',
          'alert_cap-1133',
          'alert_cap-1134',
          'alert_cap-1135',
          'alert_cap-1136',
          'alert_cap-1137',
          'alert_cap-1138',
          'alert_cap-1139',
          'alert_cap-1140',
          'alert_cap-1141',
          'alert_cap-1142',
          'alert_cap-1143',
          'alert_cap-1144',
          'alert_cap-1145',
          'alert_cap-1146',
          'alert_cap-1147',
          'alert_cap-1148',
          'alert_cap-1149',
          'alert_cap-1150',
          'alert_cap-1151',
          'alert_cap-1152',
          'alert_cap-1153',
          'alert_cap-1154',
          'alert_cap-1155',
          'alert_cap-1156',
          'alert_cap-1157',
          'alert_cap-1158',
          'alert_cap-1159',
          'alert_cap-1160',
          'alert_cap-1161',
          'alert_cap-1162',
          'alert_cap-1163',
          'alert_cap-1164',
          'alert_cap-1165',
          'alert_cap-1166',
          'alert_cap-1167',
          'alert_cap-1168',
          'alert_cap-1169',
          'alert_cap-1170',
          'alert_cap-1171',
          'alert_cap-1172',
          'alert_cap-1173',
          'alert_cap-1174',
          'alert_cap-1175',
          'alert_cap-1176',
          'alert_cap-1177',
          'alert_cap-1178',
          'alert_cap-1179',
          'alert_cap-1180',
          'alert_cap-1181',
          'alert_cap-1182',
          'alert_cap-1183',
          'alert_cap-1184',
          'alert_cap-1185',
          'alert_cap-1186',
          'alert_cap-1187',
          'alert_cap-1188',
          'alert_cap-1189',
          'alert_cap-1190',
          'alert_cap-1191',
          'alert_cap-1192',
          'alert_cap-1193',
          'alert_cap-1194',
          'alert_cap-1195',
          'alert_cap-1196',
          'alert_cap-1197',
          'alert_cap-1198',
          'alert_cap-1199',
          'alert_cap-1200',
        ],
      },
    ],
    expected: {
      proposals: [
        {
          hours: 0.0,
          size: 1000,
          revisions: 10,
        },
        {
          hours: 10.0,
          size: 200,
          revisions: 2,
        },
      ],
      joined: 1000,
    },
  },
  {
    name: 'revision_budget',
    why: 'a proposal takes at most 19 joins, 20 revisions with the first',
    docs: {
      'revision_budget-1': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-2': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-3': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-4': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-5': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-6': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-7': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-8': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-9': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-10': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-11': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-12': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-13': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-14': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-15': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-16': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-17': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-18': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-19': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-20': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-21': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-22': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-23': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-24': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-25': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-26': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-27': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-28': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-29': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-30': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-31': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-32': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-33': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-34': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-35': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-36': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-37': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-38': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-39': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-40': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-41': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-42': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-43': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-44': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-45': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
      'revision_budget-46': {
        'kibana.alert.rule.uuid': 'rule-1',
        'kibana.alert.rule.revision': 1,
        host: {
          os: {
            type: 'windows',
          },
        },
        process: {
          executable: 'C:\\a\\run.exe',
          code_signature: {
            subject_name: 'Acme',
          },
        },
      },
    },
    batches: [
      {
        hours: 0,
        ids: ['revision_budget-1', 'revision_budget-2'],
      },
      {
        hours: 1,
        ids: ['revision_budget-3', 'revision_budget-4'],
      },
      {
        hours: 2,
        ids: ['revision_budget-5', 'revision_budget-6'],
      },
      {
        hours: 3,
        ids: ['revision_budget-7', 'revision_budget-8'],
      },
      {
        hours: 4,
        ids: ['revision_budget-9', 'revision_budget-10'],
      },
      {
        hours: 5,
        ids: ['revision_budget-11', 'revision_budget-12'],
      },
      {
        hours: 6,
        ids: ['revision_budget-13', 'revision_budget-14'],
      },
      {
        hours: 7,
        ids: ['revision_budget-15', 'revision_budget-16'],
      },
      {
        hours: 8,
        ids: ['revision_budget-17', 'revision_budget-18'],
      },
      {
        hours: 9,
        ids: ['revision_budget-19', 'revision_budget-20'],
      },
      {
        hours: 10,
        ids: ['revision_budget-21', 'revision_budget-22'],
      },
      {
        hours: 11,
        ids: ['revision_budget-23', 'revision_budget-24'],
      },
      {
        hours: 12,
        ids: ['revision_budget-25', 'revision_budget-26'],
      },
      {
        hours: 13,
        ids: ['revision_budget-27', 'revision_budget-28'],
      },
      {
        hours: 14,
        ids: ['revision_budget-29', 'revision_budget-30'],
      },
      {
        hours: 15,
        ids: ['revision_budget-31', 'revision_budget-32'],
      },
      {
        hours: 16,
        ids: ['revision_budget-33', 'revision_budget-34'],
      },
      {
        hours: 17,
        ids: ['revision_budget-35', 'revision_budget-36'],
      },
      {
        hours: 18,
        ids: ['revision_budget-37', 'revision_budget-38'],
      },
      {
        hours: 19,
        ids: ['revision_budget-39', 'revision_budget-40'],
      },
      {
        hours: 20,
        ids: ['revision_budget-41', 'revision_budget-42'],
      },
      {
        hours: 21,
        ids: ['revision_budget-43', 'revision_budget-44'],
      },
      {
        hours: 22,
        ids: ['revision_budget-45', 'revision_budget-46'],
      },
    ],
    expected: {
      proposals: [
        {
          hours: 0.0,
          size: 40,
          revisions: 20,
        },
        {
          hours: 20.0,
          size: 6,
          revisions: 3,
        },
      ],
      joined: 42,
    },
  },
];
