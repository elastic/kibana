/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Brief } from '../../../../../../common/entity_analytics/executive_brief/brief';
import type { Evidence } from '../../../../../../common/entity_analytics/executive_brief/evidence';

/**
 * Fixture evidence:
 * - Threat A: ENT-1 (privileged user) with ENT-2, ENT-3, ENT-4 via F-1 (critical attack discovery
 *   with Lateral Movement), L-1 same_attack 1-4, L-2 accesses_rarely 1-3, L-3 co_alert 1-2.
 * - Threat B: ENT-5 owns ENT-6 (L-4), alerts together in F-4.
 * - ENT-7 is unconnected noise (F-6).
 */
export const FIXTURE_EVIDENCE: Evidence = {
  entities: {
    'ENT-1': {
      id: 'ENT-1',
      euid: 'user:a.rodriguez@corp',
      type: 'user',
      name: 'a.rodriguez',
      riskScore: 92.5,
      riskLevel: 'Critical',
      criticality: 'high_impact',
      privileged: true,
      watchlists: ['Privileged users'],
      aliasCount: 2,
    },
    'ENT-2': { id: 'ENT-2', euid: 'host:LAPTOP-FIN03', type: 'host', name: 'LAPTOP-FIN03' },
    'ENT-3': {
      id: 'ENT-3',
      euid: 'host:jump-box-01',
      type: 'host',
      name: 'jump-box-01',
      riskLevel: 'High',
    },
    'ENT-4': {
      id: 'ENT-4',
      euid: 'host:docker-host-prod-01',
      type: 'host',
      name: 'docker-host-prod-01',
      criticality: 'extreme_impact',
    },
    'ENT-5': { id: 'ENT-5', euid: 'user:j.chen', type: 'user', name: 'j.chen' },
    'ENT-6': { id: 'ENT-6', euid: 'host:LAPTOP-MKT07', type: 'host', name: 'LAPTOP-MKT07' },
    'ENT-7': { id: 'ENT-7', euid: 'service:svc-build', type: 'service', name: 'svc-build' },
  },
  facts: [
    {
      id: 'F-1',
      kind: 'attack_discovery',
      signalId: 'attack_discoveries',
      title: 'Stolen privileged credentials used to reach docker-host-prod-01',
      at: '2026-10-07T08:31:00.000Z',
      severity: 'critical',
      entities: ['ENT-1', 'ENT-3', 'ENT-4'],
      numbers: { alerts: 12 },
      details: { tactics: 'Initial Access, Credential Access, Lateral Movement' },
      source: {
        type: 'attack_discovery',
        id: '8f14e45f-ceea-467a-9575-0b2f0d8c7a11',
        name: 'Stolen credentials',
      },
    },
    {
      id: 'F-2',
      kind: 'alert_activity',
      signalId: 'alert_activity',
      title: 'Alerts on a.rodriguez',
      at: '2026-10-06T10:00:00.000Z',
      severity: 'high',
      entities: ['ENT-1', 'ENT-2'],
      numbers: { alerts: 57, rules: 4 },
      details: { tactics: 'Credential Access' },
    },
    {
      id: 'F-3',
      kind: 'high_risk_entity',
      signalId: 'high_risk_entities',
      title: 'Critical risk user',
      severity: 'critical',
      entities: ['ENT-1'],
      numbers: { riskScore: 92.5 },
    },
    {
      id: 'F-4',
      kind: 'alert_activity',
      signalId: 'alert_activity',
      title: 'Alerts on j.chen and LAPTOP-MKT07',
      at: '2026-10-08T12:00:00.000Z',
      severity: 'medium',
      entities: ['ENT-5', 'ENT-6'],
      numbers: { alerts: 3 },
    },
    {
      id: 'F-5',
      kind: 'relationship_first_seen',
      signalId: 'relationships',
      title: 'First-ever logon to jump-box-01',
      at: '2026-10-06T09:00:00.000Z',
      entities: ['ENT-1', 'ENT-3'],
    },
    {
      id: 'F-6',
      kind: 'alert_activity',
      signalId: 'alert_activity',
      title: 'Alerts on svc-build',
      at: '2026-10-09T00:00:00.000Z',
      severity: 'low',
      entities: ['ENT-7'],
      numbers: { alerts: 2 },
    },
  ],
  links: [
    { id: 'L-1', type: 'same_attack', from: 'ENT-1', to: 'ENT-4', factIds: ['F-1'] },
    {
      id: 'L-2',
      type: 'accesses_rarely',
      from: 'ENT-1',
      to: 'ENT-3',
      factIds: ['F-5'],
      firstSeen: '2026-10-06T09:00:00.000Z',
    },
    { id: 'L-3', type: 'co_alert', from: 'ENT-1', to: 'ENT-2', factIds: ['F-2'] },
    { id: 'L-4', type: 'owns', from: 'ENT-5', to: 'ENT-6', factIds: [] },
  ],
  signals: [
    {
      id: 'attack_discoveries',
      title: 'Attack discoveries',
      capability: 'attack_discovery',
      status: 'ok',
      durationMs: 120,
      factCount: 1,
      linkCount: 1,
    },
    {
      id: 'alert_activity',
      title: 'Alert activity',
      capability: 'detections',
      status: 'ok',
      durationMs: 300,
      factCount: 3,
      linkCount: 1,
    },
    {
      id: 'high_risk_entities',
      title: 'High-risk entities',
      capability: 'risk_scoring',
      status: 'ok',
      durationMs: 80,
      factCount: 1,
      linkCount: 0,
    },
    {
      id: 'relationships',
      title: 'Relationships',
      capability: 'relationships',
      status: 'ok',
      durationMs: 90,
      factCount: 1,
      linkCount: 2,
    },
    {
      id: 'response_status',
      title: 'Response status',
      capability: 'cases',
      status: 'unavailable',
      reason: 'Cases are not available in this space',
      durationMs: 1,
      factCount: 0,
      linkCount: 0,
    },
    {
      id: 'risk_history',
      title: 'Risk history',
      capability: 'risk_scoring',
      status: 'timeout',
      durationMs: 10000,
      factCount: 0,
      linkCount: 0,
    },
  ],
};

export const EMPTY_EVIDENCE: Evidence = { entities: {}, facts: [], links: [], signals: [] };

/** A brief that passes every check against FIXTURE_EVIDENCE. */
export const buildValidBrief = (): Brief => ({
  verdict: {
    level: 'urgent',
    headline: 'A privileged account was used to reach a critical production host',
    summary:
      'An unaddressed critical attack discovery covers ENT-1, ENT-3 and ENT-4 with 12 alerts. No case is open yet.',
    evidence: ['F-1', 'F-3'],
  },
  areas: [
    {
      id: 'threats',
      level: 'urgent',
      summary: 'One critical threat involves a privileged user and a production host.',
      evidence: ['F-1'],
    },
    {
      id: 'response',
      level: 'action',
      summary: 'Response status could not be checked; no case is visible for the attack.',
      evidence: ['F-1'],
    },
  ],
  threats: [
    {
      title: 'Stolen privileged credentials reach a production host',
      severity: 'critical',
      status: 'unaddressed',
      confidence: 'high',
      entities: ['ENT-1', 'ENT-2', 'ENT-3', 'ENT-4'],
      narrative:
        'ENT-1 logged on to (rarely) ENT-3 for the first time, then appeared together in alerts with ENT-2. The discovered attack links ENT-1 and ENT-4 with 12 alerts.',
      whyItMatters: 'ENT-1 is privileged and ENT-4 is an extreme-impact production host.',
      keyEvents: ['F-5', 'F-2', 'F-1'],
      evidence: ['F-1', 'F-2', 'F-5', 'L-1', 'L-2', 'L-3'],
      nextStep: {
        action: 'Reset the credentials of ENT-1 and isolate ENT-4',
        owner: 'soc',
        urgency: 'now',
      },
    },
    {
      title: 'Unusual alerts on a marketing laptop',
      severity: 'medium',
      status: 'unaddressed',
      confidence: 'medium',
      entities: ['ENT-5', 'ENT-6'],
      narrative: 'ENT-5 owns ENT-6, and both appeared together in 3 alerts.',
      whyItMatters: 'Low business impact so far.',
      keyEvents: ['F-4'],
      evidence: ['F-4', 'L-4'],
      nextStep: { action: 'Review the alerts on ENT-6', owner: 'soc', urgency: 'this_week' },
    },
  ],
  actions: [
    {
      action: 'Reset the credentials of ENT-1',
      rationale: 'The account is privileged and part of a critical discovered attack.',
      urgency: 'now',
      owner: 'iam',
      threat: 1,
      targets: ['ENT-1'],
      evidence: ['F-1'],
    },
    {
      action: 'Review the alerts on ENT-6',
      rationale: 'The alerts have not been triaged.',
      urgency: 'this_week',
      owner: 'soc',
      threat: 2,
      targets: ['ENT-6'],
      evidence: ['F-4'],
    },
  ],
});
