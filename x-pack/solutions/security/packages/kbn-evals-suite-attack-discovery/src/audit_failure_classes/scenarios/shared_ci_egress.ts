/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AuditScenario } from '../types';
import { defineAlerts, type AlertDraft } from '../define_alerts';
import {
  ACCOUNT_DATA,
  ACCOUNT_PROD,
  ACCOUNT_SANDBOX,
  SHARED_EGRESS_ASN,
  SHARED_EGRESS_IP,
  cloudAlertFields,
  principalIn,
} from '../cloud_alert';

const alice = principalIn(ACCOUNT_PROD, 'alice.dev');
const bob = principalIn(ACCOUNT_DATA, 'bob.analyst');
const runner = principalIn(ACCOUNT_SANDBOX, 'ci-runner');

const common = { sourceIp: SHARED_EGRESS_IP, asn: SHARED_EGRESS_ASN };

/**
 * Drafts for three unrelated principals whose only link is the shared egress NAT.
 * Reused as noise by `positive-chain-with-noise`.
 */
export const buildSharedCiEgressDrafts = (): AlertDraft[] => [
  {
    key: 'alice-1',
    group: 'alice-console-logins',
    fields: cloudAlertFields({
      ...common,
      time: '2026-03-10T09:02:11.000Z',
      rule: 'AWS Console Login from New IP',
      severity: 'low',
      riskScore: 21,
      tactic: 'Initial Access',
      description: 'A console login came from a source IP not seen for this principal.',
      message: 'ConsoleLogin succeeded for alice.dev from a new IP',
      account: ACCOUNT_PROD,
      principal: alice,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
    }),
  },
  {
    key: 'alice-2',
    group: 'alice-console-logins',
    fields: cloudAlertFields({
      ...common,
      time: '2026-03-10T13:40:52.000Z',
      rule: 'AWS Console Login from New IP',
      severity: 'low',
      riskScore: 21,
      tactic: 'Initial Access',
      description: 'A console login came from a source IP not seen for this principal.',
      message: 'ConsoleLogin succeeded for alice.dev from a new IP',
      account: ACCOUNT_PROD,
      principal: alice,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
    }),
  },
  {
    key: 'bob-1',
    group: 'bob-bucket-listings',
    fields: cloudAlertFields({
      ...common,
      time: '2026-03-10T10:15:30.000Z',
      rule: 'AWS S3 Bucket Listing from Unusual Source',
      severity: 'low',
      riskScore: 21,
      tactic: 'Discovery',
      description: 'ListBuckets was called from a source IP unusual for this principal.',
      message: 'ListBuckets succeeded for bob.analyst from an unusual source',
      account: ACCOUNT_DATA,
      principal: bob,
      userAgent: 'aws-cli/2.15.0 Python/3.11.6 Linux/6.1.0',
    }),
  },
  {
    key: 'bob-2',
    group: 'bob-bucket-listings',
    fields: cloudAlertFields({
      ...common,
      time: '2026-03-10T15:21:07.000Z',
      rule: 'AWS S3 Bucket Listing from Unusual Source',
      severity: 'low',
      riskScore: 21,
      tactic: 'Discovery',
      description: 'ListBuckets was called from a source IP unusual for this principal.',
      message: 'ListBuckets succeeded for bob.analyst from an unusual source',
      account: ACCOUNT_DATA,
      principal: bob,
      userAgent: 'aws-cli/2.15.0 Python/3.11.6 Linux/6.1.0',
    }),
  },
  {
    key: 'runner-1',
    group: 'ci-runner-assume-roles',
    fields: cloudAlertFields({
      ...common,
      time: '2026-03-10T11:05:44.000Z',
      rule: 'AWS STS AssumeRole from New IP',
      severity: 'low',
      riskScore: 21,
      tactic: 'Privilege Escalation',
      description: 'AssumeRole was called from a source IP not seen for this principal.',
      message: 'AssumeRole succeeded for ci-runner from a new IP',
      account: ACCOUNT_SANDBOX,
      principal: runner,
      userAgent: 'aws-sdk-go/1.50.0 (go1.21.6; linux; amd64)',
    }),
  },
  {
    key: 'runner-2',
    group: 'ci-runner-assume-roles',
    fields: cloudAlertFields({
      ...common,
      time: '2026-03-10T14:48:19.000Z',
      rule: 'AWS STS AssumeRole from New IP',
      severity: 'low',
      riskScore: 21,
      tactic: 'Privilege Escalation',
      description: 'AssumeRole was called from a source IP not seen for this principal.',
      message: 'AssumeRole succeeded for ci-runner from a new IP',
      account: ACCOUNT_SANDBOX,
      principal: runner,
      userAgent: 'aws-sdk-go/1.50.0 (go1.21.6; linux; amd64)',
    }),
  },
];

export const SHARED_CI_EGRESS_GROUPS = [
  'alice-console-logins',
  'bob-bucket-listings',
  'ci-runner-assume-roles',
] as const;

const SCENARIO_ID = 'shared-ci-egress';

const { alerts, alertGroups } = defineAlerts(SCENARIO_ID, buildSharedCiEgressDrafts());

/**
 * Isolates one failure: a shared source address treated as a link between principals.
 *
 * Three unrelated principals in three accounts raise low-severity alerts from one egress NAT
 * address. The principals are already separable in the baseline render by `user.name` and
 * `cloud.account.name`, so a model that joins them is joining on the shared `source.ip` against
 * the evidence in front of it. The enriched variants add the shared-NAT signal (the same
 * `source.as.*` on every alert, from the documentation ranges), `user.id` and
 * `user_agent.original`; they do not make the principals any more separable than baseline did.
 * No discovery should span two of them.
 *
 * Gold decision: no discovery at all is expected, so `expectedDiscoveries` is `'none'` and
 * `NegativeControl` also scores this scenario, including a discovery about one principal alone.
 * Each principal has two low-severity (21) alerts of one kind, each repeating the same
 * user agent from the shared NAT address: a console login or an unusual-source `ListBuckets` or
 * `AssumeRole` call. Nothing follows the access (no privilege change, data read or persistence),
 * so there is no behaviour to report even per principal. `ForbiddenJoin` is still the
 * evaluator that isolates the join failure; `NegativeControl` adds the check that the batch is
 * not escalated into a story at all.
 */
export const sharedCiEgressScenario: AuditScenario = {
  id: SCENARIO_ID,
  description:
    'Unrelated principals, already separable by user.name and account, share one egress NAT IP; a shared source.ip is not a link.',
  provenance: 'authored',
  alerts,
  operatorContext: 'CI runners in the build VPC egress through a shared NAT gateway.',
  gold: {
    alertGroups,
    forbiddenCoCitation: [
      ['alice-console-logins', 'bob-bucket-listings'],
      ['alice-console-logins', 'ci-runner-assume-roles'],
      ['bob-bucket-listings', 'ci-runner-assume-roles'],
    ],
    expectedDiscoveries: 'none',
    confirmedGroups: [],
  },
};
