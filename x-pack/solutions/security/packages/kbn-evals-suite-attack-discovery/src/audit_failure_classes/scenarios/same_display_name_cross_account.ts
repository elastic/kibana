/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AuditScenario } from '../types';
import { defineAlerts, type AlertDraft } from '../define_alerts';
import { ACCOUNT_PROD, ACCOUNT_SANDBOX, cloudAlertFields, principalIn } from '../cloud_alert';

const SCENARIO_ID = 'same-display-name-cross-account';

/** Same display name, two accounts, two different IAM principals. */
const sandboxBot = principalIn(ACCOUNT_SANDBOX, 'deploy-bot');
const prodBot = principalIn(ACCOUNT_PROD, 'deploy-bot');

const sandboxAlert = (key: string, time: string, ip: string): AlertDraft => ({
  key,
  group: 'sandbox-deploy-bot',
  fields: cloudAlertFields({
    time,
    rule: 'AWS IAM Policy Attached to Role',
    severity: 'low',
    riskScore: 21,
    tactic: 'Persistence',
    description: 'A managed policy was attached to an IAM role.',
    message: 'AttachRolePolicy succeeded for deploy-bot during a pipeline run',
    account: ACCOUNT_SANDBOX,
    principal: sandboxBot,
    sourceIp: ip,
    userAgent: 'Terraform/1.7.4 (+https://www.terraform.io) terraform-provider-aws/5.38.0',
  }),
});

const prodAlert = (
  key: string,
  time: string,
  rule: string,
  tactic: string,
  description: string,
  message: string,
  severity: 'medium' | 'high',
  riskScore: number
): AlertDraft => ({
  key,
  group: 'prod-deploy-bot',
  fields: cloudAlertFields({
    time,
    rule,
    severity,
    riskScore,
    tactic,
    description,
    message,
    account: ACCOUNT_PROD,
    principal: prodBot,
    sourceIp: '198.51.100.77',
    userAgent: 'python-requests/2.31.0',
  }),
});

const drafts: AlertDraft[] = [
  sandboxAlert('sandbox-1', '2026-03-11T08:10:00.000Z', '10.20.1.15'),
  sandboxAlert('sandbox-2', '2026-03-11T08:40:00.000Z', '10.20.1.15'),
  sandboxAlert('sandbox-3', '2026-03-11T09:05:00.000Z', '10.20.1.16'),
  prodAlert(
    'prod-1',
    '2026-03-11T02:11:00.000Z',
    'AWS CloudTrail Logging Stopped',
    'Defense Evasion',
    'CloudTrail logging was stopped for a trail.',
    'StopLogging succeeded for deploy-bot on a production trail',
    'high',
    73
  ),
  prodAlert(
    'prod-2',
    '2026-03-11T02:14:00.000Z',
    'AWS IAM Access Key Created for Another User',
    'Persistence',
    'An access key was created for an IAM user other than the caller.',
    'CreateAccessKey succeeded for deploy-bot targeting a different IAM user',
    'high',
    73
  ),
  prodAlert(
    'prod-3',
    '2026-03-11T02:21:00.000Z',
    'AWS S3 Bulk Object Download from Unusual Source',
    'Exfiltration',
    'A large number of S3 objects were read from an unusual source.',
    'GetObject succeeded 4200 times for deploy-bot against a customer-data bucket',
    'medium',
    47
  ),
];

const { alerts, alertGroups } = defineAlerts(SCENARIO_ID, drafts);

/**
 * `deploy-bot` exists in two accounts. In the sandbox it makes routine policy attachments from
 * internal IPs. In production the same display name stops logging, mints a key and bulk-reads
 * S3. They are different principals; only the production one is a chain, and no discovery may
 * fold the sandbox alerts into it.
 */
export const sameDisplayNameCrossAccountScenario: AuditScenario = {
  id: SCENARIO_ID,
  description:
    'The same user.name (deploy-bot) is a routine pipeline identity in one AWS account and a suspicious chain in another.',
  provenance: 'authored',
  alerts,
  gold: {
    alertGroups,
    forbiddenCoCitation: [['sandbox-deploy-bot', 'prod-deploy-bot']],
    expectedDiscoveries: 'atLeastOne',
    requiredGroup: 'prod-deploy-bot',
    confirmed: false,
  },
};
