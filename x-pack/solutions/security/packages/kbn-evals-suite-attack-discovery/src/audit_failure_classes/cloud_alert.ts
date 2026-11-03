/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AuditAlert } from './types';

export interface CloudAccount {
  id: string;
  name: string;
}

export interface CloudPrincipal {
  name: string;
  arn: string;
}

export const ACCOUNT_PROD: CloudAccount = { id: '111111111111', name: 'prod-payments' };
export const ACCOUNT_SANDBOX: CloudAccount = { id: '222222222222', name: 'sandbox-ci' };
export const ACCOUNT_DATA: CloudAccount = { id: '333333333333', name: 'data-platform' };

/** Egress NAT shared by CI runners and the office VPN (documentation range, RFC 5737). */
export const SHARED_EGRESS_IP = '203.0.113.50';

export const principalIn = (account: CloudAccount, name: string): CloudPrincipal => ({
  name,
  arn: `arn:aws:iam::${account.id}:user/${name}`,
});

/** Builds the fields of a CloudTrail-derived detection alert. Values must not contain commas. */
export const cloudAlertFields = ({
  time,
  rule,
  severity,
  riskScore,
  tactic,
  description,
  message,
  account,
  principal,
  sourceIp,
  region = 'us-east-1',
  userAgent,
  asn,
  outcome = 'success',
  includeAccountName = true,
}: {
  time: string;
  rule: string;
  severity: 'low' | 'medium' | 'high';
  riskScore: number;
  tactic: string;
  description: string;
  message: string;
  account: CloudAccount;
  principal?: CloudPrincipal;
  sourceIp?: string;
  region?: string;
  userAgent?: string;
  asn?: { number: number; organization: string };
  outcome?: 'success' | 'failure';
  /**
   * The CloudTrail integration populates `cloud.account.id` but usually no account name; pass
   * `false` for alerts that must not carry one.
   */
  includeAccountName?: boolean;
}): AuditAlert['fields'] => ({
  '@timestamp': time,
  'kibana.alert.rule.name': rule,
  'kibana.alert.rule.description': description,
  'kibana.alert.severity': severity,
  'kibana.alert.risk_score': riskScore,
  'kibana.alert.rule.threat.tactic.name': tactic,
  'event.category': 'iam',
  'event.dataset': 'aws.cloudtrail',
  'event.outcome': outcome,
  message,
  'cloud.provider': 'aws',
  'cloud.region': region,
  ...(includeAccountName ? { 'cloud.account.name': account.name } : {}),
  'cloud.account.id': account.id,
  ...(principal ? { 'user.name': principal.name, 'user.id': principal.arn } : {}),
  ...(sourceIp ? { 'source.ip': sourceIp } : {}),
  ...(userAgent ? { 'user_agent.original': userAgent } : {}),
  ...(asn
    ? { 'source.as.number': asn.number, 'source.as.organization.name': asn.organization }
    : {}),
});

export const SHARED_EGRESS_ASN = { number: 64500, organization: 'Example Egress Provider' };
