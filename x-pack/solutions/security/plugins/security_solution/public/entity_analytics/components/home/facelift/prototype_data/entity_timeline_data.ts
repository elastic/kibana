/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * One year of history for amber.rodriguez (resolved from AD, Okta and Workday).
 *
 * The open alerts from the last 30 days plus the modifiers in effect add up to
 * the identity's risk score (93): alerts 62.0 + criticality 12 + watchlists 19.
 * The attack session ~1 day ago is what Attack discovery correlated.
 */

import { RiskSeverity } from '../../../../../../common/search_strategy';
import type { EntityTimelineData, EntityTimelineEvent } from '../../../entity_timeline/types';
import { IDENTITY_BY_ID, RAW_RECORDS } from './data';

const HOUR = 36e5;
const DAY = 24 * HOUR;

const hoursAgo = (hours: number): string => new Date(Date.now() - hours * HOUR).toISOString();

const daysAgo = (days: number, hour = 10, minute = 0): string => {
  const date = new Date(Date.now() - days * DAY);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

export const AMBER_ATTACK_ID = 'attack-cred-theft-aws';

const ATTACK_ALERT_IDS = ['al-asn', 'al-ml-ip', 'al-privesc', 'burst-dcsync', 'al-aws-key'];

const AMBER_EVENTS: EntityTimelineEvent[] = [
  // ---------------------------------------------------------------------------
  // Identity lifecycle and older history (outside the 30-day risk window)
  // ---------------------------------------------------------------------------
  {
    id: 'id-first-seen',
    kind: 'identity',
    timestamp: daysAgo(365, 9, 12),
    title: 'First seen',
    description: 'Account amber.rodriguez created in corp.acme.com (OU=IT Operations).',
    source: 'Active Directory',
    record: 'Active Directory',
  },
  {
    id: 'res-workday',
    kind: 'resolution',
    timestamp: daysAgo(362, 2, 0),
    title: 'Workday record resolved to this entity',
    description: 'Amber Rodriguez (100482) matched on work email. Automatic resolution.',
    source: 'Entity resolution',
    record: 'Workday',
  },
  {
    id: 'res-okta',
    kind: 'resolution',
    timestamp: daysAgo(360, 2, 0),
    title: 'Okta record resolved to this entity',
    description: 'amber.rodriguez@acme.com matched on work email. Automatic resolution.',
    source: 'Entity resolution',
    record: 'Okta',
  },
  {
    id: 'crit-medium',
    kind: 'criticality',
    timestamp: daysAgo(330, 14, 30),
    title: 'Asset criticality set to Medium impact',
    description: 'Bulk upload (asset_criticality_it_ops.csv).',
    source: 'File upload · s.patel',
    criticalityFrom: 'unassigned',
    criticalityTo: 'medium_impact',
    contributionDelta: 4,
  },
  {
    id: 'al-mfa-push',
    kind: 'alert',
    timestamp: daysAgo(290, 7, 41),
    title: 'Multiple MFA push requests denied',
    description: 'Closed as false positive by j.chen — new phone enrollment.',
    source: 'Okta',
    record: 'Okta',
    severity: 'low',
    ruleScore: 21,
    status: 'closed',
    tactic: 'Credential access',
  },
  {
    id: 'id-role-change',
    kind: 'identity',
    timestamp: daysAgo(240, 8, 0),
    title: 'Role changed: IT Operations Engineer → IT Operations Lead',
    description: 'Manager: d.okafor. Cost center IT-200.',
    source: 'Workday',
    record: 'Workday',
  },
  {
    id: 'wl-privileged',
    kind: 'watchlist',
    timestamp: daysAgo(239, 11, 5),
    title: 'Added to Privileged users',
    description: 'Privileged user monitoring detected membership in Domain Admins.',
    source: 'Privileged user monitoring',
    record: 'Active Directory',
    watchlist: 'Privileged users',
    watchlistAction: 'added',
    contributionDelta: 14,
    keyReason: 'First privileged group membership for this entity.',
  },
  {
    id: 'crit-high',
    kind: 'criticality',
    timestamp: daysAgo(238, 16, 20),
    title: 'Asset criticality raised to High impact',
    description: 'Now holds Domain Admins.',
    source: 'Analyst · s.patel',
    criticalityFrom: 'medium_impact',
    criticalityTo: 'high_impact',
    contributionDelta: 4,
  },
  {
    id: 'wl-departing-add',
    kind: 'watchlist',
    timestamp: daysAgo(200, 9, 0),
    title: 'Added to Departing employees',
    description: 'Workday: resignation submitted, last day in 30 days.',
    source: 'Workday sync',
    record: 'Workday',
    watchlist: 'Departing employees',
    watchlistAction: 'added',
    contributionDelta: 6,
  },
  {
    id: 'wl-departing-remove',
    kind: 'watchlist',
    timestamp: daysAgo(185, 9, 0),
    title: 'Removed from Departing employees',
    description: 'Workday: resignation withdrawn.',
    source: 'Workday sync',
    record: 'Workday',
    watchlist: 'Departing employees',
    watchlistAction: 'removed',
    contributionDelta: -6,
  },
  {
    id: 'al-travel',
    kind: 'alert',
    timestamp: daysAgo(150, 6, 18),
    title: 'Okta login from unusual location — Madrid, ES',
    source: 'Okta',
    record: 'Okta',
    severity: 'medium',
    ruleScore: 47,
    status: 'closed',
    tactic: 'Initial access',
    caseId: 'CASE-1043',
  },
  {
    id: 'case-travel',
    kind: 'case',
    timestamp: daysAgo(148, 15, 0),
    title: 'CASE-1043 closed — Travel verification',
    description: 'Benign: confirmed business travel with manager.',
    source: 'Cases · j.chen',
    caseId: 'CASE-1043',
    caseAction: 'closed',
  },
  {
    id: 'an-rare-process',
    kind: 'anomaly',
    timestamp: daysAgo(120, 22, 40),
    title: 'Rare process for user: rclone.exe',
    description: 'Not promoted to an alert.',
    source: 'Machine learning',
    host: 'WKS-0412',
    mlJob: 'auth_rare_process_for_user',
    anomalyScore: 62,
  },
  {
    id: 'risk-moderate-old',
    kind: 'risk_level',
    timestamp: daysAgo(95, 3, 0),
    title: 'Risk level rose to Moderate',
    source: 'Risk engine',
    riskFrom: { score: 31, level: RiskSeverity.Low },
    riskTo: { score: 46, level: RiskSeverity.Moderate },
  },
  {
    id: 'al-encoded-ps',
    kind: 'alert',
    timestamp: daysAgo(94, 13, 2),
    title: 'PowerShell encoded command',
    source: 'Elastic Defend',
    host: 'WKS-0412',
    record: 'Active Directory',
    severity: 'medium',
    ruleScore: 47,
    status: 'closed',
    tactic: 'Execution',
  },
  {
    id: 'note-ps',
    kind: 'note',
    timestamp: daysAgo(94, 15, 30),
    title: 'Note by j.chen',
    description: 'Expected: weekly patching script signed by IT Ops. Added rule exception.',
    source: 'Analyst · j.chen',
  },
  {
    id: 'risk-low-old',
    kind: 'risk_level',
    timestamp: daysAgo(64, 3, 0),
    title: 'Risk level dropped to Low',
    description: 'Older alerts left the 30-day risk window.',
    source: 'Risk engine',
    riskFrom: { score: 46, level: RiskSeverity.Moderate },
    riskTo: { score: 22, level: RiskSeverity.Low },
  },

  // ---------------------------------------------------------------------------
  // Last 30 days (risk window)
  // ---------------------------------------------------------------------------
  {
    id: 'al-mfa-reset',
    kind: 'alert',
    timestamp: daysAgo(27, 18, 22),
    title: 'Okta MFA factor reset by user',
    source: 'Okta',
    record: 'Okta',
    severity: 'low',
    ruleScore: 21,
    status: 'open',
    tactic: 'Persistence',
    contribution: 2.1,
  },
  {
    id: 'crit-extreme',
    kind: 'criticality',
    timestamp: daysAgo(21, 10, 15),
    title: 'Asset criticality raised to Extreme impact',
    description: 'Granted AWS Organization admin on top of Domain Admins.',
    source: 'Analyst · s.patel',
    criticalityFrom: 'high_impact',
    criticalityTo: 'extreme_impact',
    contributionDelta: 4,
  },
  {
    id: 'al-impossible-travel',
    kind: 'alert',
    timestamp: daysAgo(12, 4, 51),
    title: 'Okta impossible travel',
    description: 'Closed as false positive by j.chen — corporate VPN egress.',
    source: 'Okta',
    record: 'Okta',
    severity: 'low',
    ruleScore: 21,
    status: 'closed',
    tactic: 'Initial access',
  },
  {
    id: 'an-sharepoint',
    kind: 'anomaly',
    timestamp: daysAgo(10, 23, 5),
    title: 'Unusual volume of SharePoint downloads',
    description: '1,284 files in 40 minutes; typical is under 30 per day.',
    source: 'Machine learning',
    mlJob: 'o365_high_download_volume_user',
    anomalyScore: 71,
  },
  {
    id: 'al-mass-download',
    kind: 'alert',
    timestamp: daysAgo(9, 9, 14),
    title: 'Mass download from SharePoint',
    source: 'Microsoft 365',
    severity: 'medium',
    ruleScore: 47,
    status: 'open',
    tactic: 'Collection',
    contribution: 4.8,
  },
  {
    id: 'wl-custom',
    kind: 'watchlist',
    timestamp: daysAgo(4, 11, 30),
    title: 'Added to My custom watchlist',
    description: 'Q4 access review: admins with recent data-collection alerts.',
    source: 'Analyst · j.chen',
    watchlist: 'My custom watchlist',
    watchlistAction: 'added',
    contributionDelta: 5,
  },

  // Attack session (what Attack discovery correlated)
  {
    id: 'al-asn',
    kind: 'alert',
    timestamp: hoursAgo(26.2),
    title: 'Okta login from new ASN — AS9009 (M247)',
    source: 'Okta',
    record: 'Okta',
    severity: 'high',
    ruleScore: 73,
    status: 'acknowledged',
    tactic: 'Initial access',
    contribution: 7.3,
    attackId: AMBER_ATTACK_ID,
    caseId: 'CASE-1187',
    keyReason: 'First login from this ASN in 365 days observed.',
  },
  {
    id: 'al-ml-ip',
    kind: 'alert',
    timestamp: hoursAgo(26.1),
    title: 'Unusual source IP for a user',
    description: 'Promoted from ML anomaly — anomaly score 91.',
    source: 'Machine learning rule',
    record: 'Okta',
    severity: 'critical',
    ruleScore: 91,
    status: 'acknowledged',
    tactic: 'Initial access',
    mlJob: 'auth_rare_source_ip_for_a_user',
    anomalyScore: 91,
    contribution: 9.1,
    attackId: AMBER_ATTACK_ID,
    caseId: 'CASE-1187',
  },
  {
    id: 'al-privesc',
    kind: 'alert',
    timestamp: hoursAgo(25.7),
    title: 'Privilege escalation via token manipulation',
    source: 'Elastic Defend',
    host: 'WKS-0412',
    record: 'Active Directory',
    severity: 'high',
    ruleScore: 78,
    status: 'acknowledged',
    tactic: 'Privilege escalation',
    contribution: 6.2,
    attackId: AMBER_ATTACK_ID,
    caseId: 'CASE-1187',
  },
  {
    id: 'burst-dcsync',
    kind: 'alert_burst',
    timestamp: hoursAgo(25.3),
    title: 'Credential-access burst — DCSync / NTDS',
    description: '12 alerts in 7 minutes from 4 rules.',
    source: 'Elastic Defend',
    host: 'dc-01.corp.acme.com',
    record: 'Active Directory',
    severity: 'critical',
    ruleScore: 98,
    status: 'acknowledged',
    tactic: 'Credential access',
    alertCount: 12,
    burstRules: [
      { name: 'Potential credential access via DCSync', count: 5 },
      { name: 'NTDS.dit file copied', count: 3 },
      { name: 'LSASS memory dump', count: 2 },
      { name: 'Kerberos TGT requested with RC4', count: 2 },
    ],
    contribution: 18.6,
    attackId: AMBER_ATTACK_ID,
    caseId: 'CASE-1187',
    keyReason: 'First DCSync ever from this account (365 days observed).',
  },
  {
    id: 'risk-high',
    kind: 'risk_level',
    timestamp: hoursAgo(25.2),
    title: 'Risk level rose to High',
    source: 'Risk engine',
    riskFrom: { score: 37.9, level: RiskSeverity.Low },
    riskTo: { score: 79.1, level: RiskSeverity.High },
  },
  {
    id: 'al-aws-key',
    kind: 'alert',
    timestamp: hoursAgo(24.6),
    title: 'AWS IAM access key created for OrgAdmin role',
    source: 'AWS CloudTrail',
    record: 'AWS',
    severity: 'high',
    ruleScore: 82,
    status: 'acknowledged',
    tactic: 'Persistence',
    contribution: 7.9,
    attackId: AMBER_ATTACK_ID,
    caseId: 'CASE-1187',
  },
  {
    id: 'attack-cred-theft',
    kind: 'attack',
    timestamp: hoursAgo(24.2),
    title: 'Credential theft leading to AWS persistence',
    description:
      'A login from a new ASN was followed by token manipulation on WKS-0412, DCSync against dc-01 and a new access key for the AWS OrgAdmin role.',
    source: 'Attack discovery',
    attackId: AMBER_ATTACK_ID,
    alertIds: ATTACK_ALERT_IDS,
    alertCount: 16,
    attackRiskScore: 96,
    severity: 'critical',
    tactics: ['Initial access', 'Privilege escalation', 'Credential access', 'Persistence'],
    attackStart: hoursAgo(26.2),
    attackEnd: hoursAgo(24.6),
    relatedEntities: [
      { name: 'amber.rodriguez', type: 'user' },
      { name: 'WKS-0412', type: 'host' },
      { name: 'dc-01.corp.acme.com', type: 'host' },
      { name: 'aws:iam::role/OrgAdmin', type: 'service' },
    ],
    keyReason: 'New attack involving this entity.',
  },
  {
    id: 'case-cred-theft',
    kind: 'case',
    timestamp: hoursAgo(23.9),
    title: 'CASE-1187 opened — Credential theft, amber.rodriguez',
    description: 'Attack and 16 alerts attached.',
    source: 'Cases · j.chen',
    caseId: 'CASE-1187',
    caseAction: 'opened',
    attackId: AMBER_ATTACK_ID,
  },
  {
    id: 'az-suspend',
    kind: 'alertzero',
    timestamp: hoursAgo(23.5),
    title: 'Proposed action: suspend Okta user and revoke sessions',
    description:
      'The attacker still holds valid sessions from AS9009. Suspending stops new logins; existing AWS keys need a separate action.',
    source: 'AlertZero · Triage Watch',
    watch: 'Triage',
    proposedAction: 'Suspend Okta user and revoke sessions',
    alertZeroStatus: 'pending',
    attackId: AMBER_ATTACK_ID,
  },
  {
    id: 'ra-password-reset',
    kind: 'response_action',
    timestamp: hoursAgo(23.1),
    title: 'Password reset forced',
    description: 'AD password reset and Kerberos tickets purged.',
    source: 'Analyst · j.chen',
    record: 'Active Directory',
    attackId: AMBER_ATTACK_ID,
  },
  {
    id: 'note-phone',
    kind: 'note',
    timestamp: hoursAgo(21.4),
    title: 'Note by j.chen',
    description:
      'Spoke to Amber: she did not log in from M247. Her phone was lost on Friday, so MFA was likely bypassed.',
    source: 'Analyst · j.chen',
    caseId: 'CASE-1187',
    attackId: AMBER_ATTACK_ID,
  },
  {
    id: 'az-hunt',
    kind: 'alertzero',
    timestamp: hoursAgo(6.3),
    title: 'Hunt finding: same ASN used against 2 other users',
    description:
      'eva.lindqvist and noah.kim had failed Okta logins from AS9009 in the last 24 hours. Proposes adding them to the attack.',
    source: 'AlertZero · Hunt Watch',
    watch: 'Hunt',
    proposedAction: 'Add eva.lindqvist and noah.kim to the attack',
    alertZeroStatus: 'pending',
    attackId: AMBER_ATTACK_ID,
  },
  {
    id: 'al-aws-console',
    kind: 'alert',
    timestamp: hoursAgo(3.1),
    title: 'AWS console login from new ASN',
    description: 'Same ASN as the attack, but not correlated into it yet.',
    source: 'AWS CloudTrail',
    record: 'AWS',
    severity: 'high',
    ruleScore: 76,
    status: 'open',
    tactic: 'Initial access',
    contribution: 6.0,
  },
  {
    id: 'risk-critical',
    kind: 'risk_level',
    timestamp: hoursAgo(3.0),
    title: 'Risk level rose to Critical',
    source: 'Risk engine',
    riskFrom: { score: 87, level: RiskSeverity.High },
    riskTo: { score: 93, level: RiskSeverity.Critical },
    keyReason: 'First time Critical for this entity.',
  },
];

const AMBER_TIMELINE: EntityTimelineData = {
  entityName: 'amber.rodriguez',
  riskScore: 93,
  riskLevel: RiskSeverity.Critical,
  riskWindowDays: 30,
  modifiers: [
    {
      id: 'mod-criticality',
      label: 'Asset criticality',
      value: 'Extreme impact',
      contribution: 12,
      since: daysAgo(21, 10, 15),
      eventId: 'crit-extreme',
    },
    {
      id: 'mod-privileged',
      label: 'Watchlist',
      value: 'Privileged users',
      contribution: 14,
      since: daysAgo(239, 11, 5),
      eventId: 'wl-privileged',
    },
    {
      id: 'mod-custom',
      label: 'Watchlist',
      value: 'My custom watchlist',
      contribution: 5,
      since: daysAgo(4, 11, 30),
      eventId: 'wl-custom',
    },
  ],
  events: [...AMBER_EVENTS].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
};

const TIMELINES_BY_IDENTITY: Record<string, EntityTimelineData> = {
  'id-amber': AMBER_TIMELINE,
};

const identityIdByRecordId = Object.fromEntries(
  RAW_RECORDS.filter((record) => record.resolvedTo).map((record) => [
    record.entityId,
    record.resolvedTo as string,
  ])
);

const identityIdByName = Object.fromEntries(
  [
    ...Object.values(IDENTITY_BY_ID).map((identity) => [identity.name, identity.id]),
    ...RAW_RECORDS.filter((record) => record.resolvedTo).map((record) => [
      record.name,
      record.resolvedTo as string,
    ]),
  ].filter(([, id]) => TIMELINES_BY_IDENTITY[id as string])
);

/** Timeline for a target, alias or display name in the facelift corpus. */
export const getFaceliftEntityTimeline = (
  entityId?: string | null,
  entityName?: string | null
): EntityTimelineData | null => {
  const identityId =
    (entityId && (IDENTITY_BY_ID[entityId] ? entityId : identityIdByRecordId[entityId])) ||
    (entityName ? identityIdByName[entityName] : undefined);
  return (identityId && TIMELINES_BY_IDENTITY[identityId]) || null;
};
