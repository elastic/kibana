/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AuditScenario } from '../types';
import { defineAlerts, type AlertDraft } from '../define_alerts';

const SCENARIO_ID = 'threshold-meta-alerts';

const metaAlert = (
  key: string,
  time: string,
  rule: string,
  description: string,
  message: string,
  fields: Record<string, string | number> = {}
): AlertDraft => ({
  key,
  group: 'meta-alerts',
  fields: {
    '@timestamp': time,
    'kibana.alert.rule.name': rule,
    'kibana.alert.rule.description': description,
    'kibana.alert.severity': 'medium',
    'kibana.alert.risk_score': 47,
    'event.category': 'threshold',
    message,
    ...fields,
  },
});

const USER_SIDS: Record<string, string> = {
  'svc-backup': 'S-1-5-21-1004336348-1177238915-682003330-1104',
  'm.novak': 'S-1-5-21-1004336348-1177238915-682003330-1117',
};

const underlyingAlert = (
  key: string,
  time: string,
  host: string,
  user: string,
  rule: string,
  message: string
): AlertDraft => ({
  key,
  group: 'underlying-noise',
  fields: {
    '@timestamp': time,
    'kibana.alert.rule.name': rule,
    'kibana.alert.rule.description': `${rule}.`,
    'kibana.alert.severity': 'low',
    'kibana.alert.risk_score': 21,
    'event.category': 'authentication',
    'host.name': host,
    'user.name': user,
    'user.id': USER_SIDS[user],
    message,
  },
});

const drafts: AlertDraft[] = [
  metaAlert(
    'meta-1',
    '2026-03-12T10:00:00.000Z',
    'Threshold: Failed Logons Above 10 per Hour',
    'More than 10 failed logons were counted in one hour across the environment.',
    'Threshold met: 14 failed logon events in the last hour'
  ),
  metaAlert(
    'meta-2',
    '2026-03-12T10:30:00.000Z',
    'Threshold: Alert Volume Above 50 per Day',
    'The number of alerts in 24 hours exceeded the configured threshold.',
    'Threshold met: 63 alerts in the last 24 hours'
  ),
  metaAlert(
    'meta-3',
    '2026-03-12T11:00:00.000Z',
    'Multiple Alerts Involving a Single User',
    'Several different rules produced alerts for the same user.',
    'Threshold met: 5 alerts for user svc-backup in 24 hours',
    { 'user.name': 'svc-backup' }
  ),
  metaAlert(
    'meta-4',
    '2026-03-12T11:30:00.000Z',
    'Multiple Alerts in Different ATT&CK Tactics on a Single Host',
    'Alerts from several tactics were seen on one host.',
    'Threshold met: alerts from 3 tactics on host SRV-FILE-02',
    { 'host.name': 'SRV-FILE-02' }
  ),
  underlyingAlert(
    'under-1',
    '2026-03-12T09:12:00.000Z',
    'SRV-FILE-02',
    'svc-backup',
    'Failed Logon Followed by Success',
    'A single failed logon preceded a successful logon for the backup service account'
  ),
  underlyingAlert(
    'under-2',
    '2026-03-12T09:48:00.000Z',
    'SRV-FILE-02',
    'svc-backup',
    'Service Account Interactive Logon',
    'The backup service account logged on interactively during the nightly job'
  ),
  underlyingAlert(
    'under-3',
    '2026-03-12T09:55:00.000Z',
    'SRV-APP-07',
    'svc-backup',
    'Failed Logon Followed by Success',
    'A single failed logon preceded a successful logon for the backup service account'
  ),
  underlyingAlert(
    'under-4',
    '2026-03-12T10:05:00.000Z',
    'SRV-APP-07',
    'm.novak',
    'Failed Logon Followed by Success',
    'A single failed logon preceded a successful logon after a password typo'
  ),
];

const { alerts, alertGroups } = defineAlerts(SCENARIO_ID, drafts);

/**
 * Threshold and aggregate rules fire on counts of other alerts. They carry no behaviour of
 * their own, so they are not evidence.
 *
 * Gold decision: the four underlying alerts do not form a discovery either, so
 * `expectedDiscoveries` is `'none'`. They are low severity (21), each is a single failed logon
 * that preceded a success, and their own messages tie them to the nightly backup job (the one
 * `m.novak` alert to a password typo). Two hosts share a service account, which is what a backup
 * service account does. There is no lateral tool, no privilege change and no post-logon
 * behaviour. The meta alerts exist only to tempt a model into reading "5 alerts for user
 * svc-backup" as a campaign; `MetaAlertAsEvidence` scores a discovery that cites only them, and
 * `NegativeControl` scores any discovery at all.
 */
export const thresholdMetaAlertsScenario: AuditScenario = {
  id: SCENARIO_ID,
  description:
    'Threshold/aggregate alerts count other alerts and carry no behaviour; alongside benign low-severity alerts they are not an attack chain.',
  provenance: 'authored',
  alerts,
  operatorContext:
    'Threshold rules are enabled in this deployment and count alerts per user and per host.',
  gold: {
    alertGroups,
    forbiddenCoCitation: [],
    expectedDiscoveries: 'none',
    confirmedGroups: [],
    metaAlertGroups: ['meta-alerts'],
  },
};
