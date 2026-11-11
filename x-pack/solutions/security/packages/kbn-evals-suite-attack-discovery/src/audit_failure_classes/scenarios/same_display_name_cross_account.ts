/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AuditScenario } from '../types';
import { defineAlerts, type AlertDraft } from '../define_alerts';
import {
  ACCOUNT_PROD,
  ACCOUNT_SANDBOX,
  SHARED_EGRESS_ASN,
  cloudAlertFields,
  principalIn,
} from '../cloud_alert';

const SCENARIO_ID = 'same-display-name-cross-account';

/** Egress both pipelines use (documentation range, RFC 5737). */
const SOURCE_IP = '198.51.100.77';

/** Same display name, two accounts, two different IAM principals. */
const sandboxBot = principalIn(ACCOUNT_SANDBOX, 'deploy-bot');
const prodBot = principalIn(ACCOUNT_PROD, 'deploy-bot');

/**
 * Baseline fields that may differ between the two groups without giving the answer away: the
 * alert id is opaque and the timestamp is a per-event value. Any other baseline field that
 * separates the groups would hand the model the principal, so `registry.test.ts` fails on it.
 */
export const NON_IDENTIFYING_BASELINE_FIELDS: readonly string[] = ['_id', '@timestamp'];

interface Step {
  rule: string;
  tactic: string;
  description: string;
  message: string;
  severity: 'medium' | 'high';
  riskScore: number;
}

/**
 * Both accounts raise the same three alerts, with the same rule names, severities, messages,
 * region and source IP, and no account name. Everything in the baseline render is identical
 * between them except the timestamps. What separates the principals sits in the enriched
 * variants only: `user.id` and `cloud.account.id` (different principals), and
 * `user_agent.original` (Terraform in the sandbox, a Python script in production).
 */
const STEPS: readonly Step[] = [
  {
    rule: 'AWS CloudTrail Logging Stopped',
    tactic: 'Defense Evasion',
    description: 'CloudTrail logging was stopped for a trail.',
    message: 'StopLogging succeeded for deploy-bot on a trail',
    severity: 'high',
    riskScore: 73,
  },
  {
    rule: 'AWS IAM Access Key Created for Another User',
    tactic: 'Persistence',
    description: 'An access key was created for an IAM user other than the caller.',
    message: 'CreateAccessKey succeeded for deploy-bot targeting a different IAM user',
    severity: 'high',
    riskScore: 73,
  },
  {
    rule: 'AWS S3 Bulk Object Download from Unusual Source',
    tactic: 'Exfiltration',
    description: 'A large number of S3 objects were read from an unusual source.',
    message: 'GetObject succeeded 4200 times for deploy-bot against a bucket',
    severity: 'medium',
    riskScore: 47,
  },
];

const stepDrafts = (
  group: string,
  keyPrefix: string,
  account: typeof ACCOUNT_PROD,
  principal: typeof prodBot,
  userAgent: string,
  times: readonly string[]
): AlertDraft[] =>
  STEPS.map((step, index) => ({
    key: `${keyPrefix}-${index + 1}`,
    group,
    fields: cloudAlertFields({
      ...step,
      time: times[index],
      account,
      principal,
      sourceIp: SOURCE_IP,
      asn: SHARED_EGRESS_ASN,
      userAgent,
      includeAccountName: false,
    }),
  }));

const drafts: AlertDraft[] = [
  ...stepDrafts(
    'sandbox-deploy-bot',
    'sandbox',
    ACCOUNT_SANDBOX,
    sandboxBot,
    'Terraform/1.7.4 (+https://www.terraform.io) terraform-provider-aws/5.38.0',
    ['2026-03-11T02:12:00.000Z', '2026-03-11T02:16:00.000Z', '2026-03-11T02:23:00.000Z']
  ),
  ...stepDrafts('prod-deploy-bot', 'prod', ACCOUNT_PROD, prodBot, 'python-requests/2.31.0', [
    '2026-03-11T02:11:00.000Z',
    '2026-03-11T02:14:00.000Z',
    '2026-03-11T02:21:00.000Z',
  ]),
];

const { alerts, alertGroups } = defineAlerts(SCENARIO_ID, drafts);

/**
 * `deploy-bot` exists in two accounts and raises the same StopLogging, CreateAccessKey and bulk
 * S3 alerts in both, minutes apart. In the sandbox that is a Terraform pipeline; in production it
 * is a Python script that chains defense evasion, persistence and exfiltration.
 *
 * The baseline render cannot tell the accounts apart (see `NON_IDENTIFYING_BASELINE_FIELDS`), so
 * a model that behaves correctly reports at most one three-alert story and cannot know which
 * account it belongs to. Baseline recall therefore accepts either group (`requiredAnyOf`); what
 * baseline measures is whether the model joins the two groups anyway (`ForbiddenJoin`). In both
 * enriched variants `user.id`, `cloud.account.id` and `user_agent.original` separate the groups,
 * and the production chain is the one that must be recovered. No group is a confirmed
 * compromise: StopLogging, CreateAccessKey and a bulk GetObject from a script call for
 * investigation, not for unconditional containment, so `confirmedGroups` is empty.
 */
export const sameDisplayNameCrossAccountScenario: AuditScenario = {
  id: SCENARIO_ID,
  description:
    'The same user.name (deploy-bot) raises identical alerts in two AWS accounts; one account is a routine pipeline and the other a chain of defense evasion, persistence and exfiltration.',
  provenance: 'authored',
  alerts,
  operatorContext: 'The organisation runs separate prod and sandbox AWS accounts.',
  gold: {
    alertGroups,
    forbiddenCoCitation: [['sandbox-deploy-bot', 'prod-deploy-bot']],
    expectedDiscoveries: 'atLeastOne',
    requiredGroup: 'prod-deploy-bot',
    variantOverrides: {
      baseline: { requiredAnyOf: ['prod-deploy-bot', 'sandbox-deploy-bot'] },
    },
    confirmedGroups: [],
  },
};
