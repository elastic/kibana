/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Brief } from '../../../../../common/entity_analytics/executive_brief/brief';
import type { BriefResponse } from '../../../../../common/entity_analytics/executive_brief/document';
import type { Evidence } from '../../../../../common/entity_analytics/executive_brief/evidence';

export const FIXTURE_EVIDENCE: Evidence = {
  entities: {
    'ENT-1': {
      id: 'ENT-1',
      euid: 'user:a.rodriguez@acme.example',
      type: 'user',
      name: 'a.rodriguez',
      riskLevel: 'Critical',
      privileged: true,
    },
    'ENT-2': {
      id: 'ENT-2',
      euid: 'host:jump-box-01',
      type: 'host',
      name: 'jump-box-01',
      criticality: 'extreme_impact',
    },
  },
  facts: [
    {
      id: 'F-1',
      kind: 'attack_discovery',
      signalId: 'attack_discoveries',
      title: 'Credential access to lateral movement',
      at: '2026-10-08T10:00:00.000Z',
      severity: 'critical',
      entities: ['ENT-1', 'ENT-2'],
      numbers: { alerts: 12 },
      details: { tactics: 'Credential Access, Lateral Movement' },
    },
    {
      id: 'F-2',
      kind: 'alert_response',
      signalId: 'response_status',
      title: 'Open alerts without a case',
      severity: 'high',
      entities: ['ENT-2'],
      numbers: { open: 9 },
    },
  ],
  links: [
    {
      id: 'L-1',
      type: 'accesses_rarely',
      from: 'ENT-1',
      to: 'ENT-2',
      factIds: ['F-1'],
    },
  ],
  signals: [
    {
      id: 'attack_discoveries',
      title: 'Attack discoveries',
      capability: 'attack_discovery',
      status: 'ok',
      durationMs: 120,
      factCount: 2,
      linkCount: 0,
    },
    {
      id: 'high_risk_entities',
      title: 'High-risk entities',
      capability: 'risk_scoring',
      status: 'ok',
      durationMs: 80,
      factCount: 5,
      linkCount: 0,
    },
    {
      id: 'hunting_leads',
      title: 'Hunting leads',
      capability: 'hunting_leads',
      status: 'unavailable',
      reason: 'Hunting leads have never been run',
      durationMs: 5,
      factCount: 0,
      linkCount: 0,
    },
  ],
};

export const FIXTURE_BRIEF: Brief = {
  verdict: {
    level: 'urgent',
    headline: 'A privileged account reached a critical host.',
    summary: 'a.rodriguez logged on to jump-box-01 after credential access alerts.',
    evidence: ['F-1', 'ENT-1', 'L-1'],
  },
  areas: [
    {
      id: 'threats',
      level: 'urgent',
      summary: '1 critical threat unaddressed',
      evidence: ['F-1'],
    },
    {
      id: 'response',
      level: 'action',
      summary: '9 high/critical alerts have no case',
      evidence: ['F-2'],
    },
  ],
  threats: [
    {
      title: 'Privileged credential misuse',
      severity: 'critical',
      status: 'unaddressed',
      confidence: 'high',
      entities: ['ENT-1', 'ENT-2'],
      narrative: 'The account moved from credential access to lateral movement.',
      whyItMatters: 'The host is extreme impact.',
      keyEvents: ['F-1'],
      evidence: ['F-1', 'L-1'],
      nextStep: {
        action: 'Isolate jump-box-01 and reset the credentials',
        owner: 'soc',
        urgency: 'now',
      },
    },
    {
      title: 'Unowned alerts',
      severity: 'high',
      status: 'in_progress',
      confidence: 'medium',
      entities: ['ENT-2'],
      narrative: 'Alerts are piling up.',
      whyItMatters: 'Nobody owns them.',
      keyEvents: [],
      evidence: ['F-2'],
      nextStep: { action: 'Open a case', owner: 'soc', urgency: 'this_week' },
    },
  ],
  actions: [
    {
      action: 'Reset a.rodriguez credentials',
      rationale: 'The account is privileged.',
      urgency: 'now',
      owner: 'iam',
      threat: 1,
      targets: ['ENT-1'],
      evidence: ['F-1'],
    },
  ],
};

export const buildBriefResponse = (overrides: Partial<BriefResponse> = {}): BriefResponse => ({
  space_id: 'default',
  owner: { username: 'elastic' },
  job: { id: 'job-1', status: 'succeeded', started_at: '2026-10-09T10:00:00.000Z' },
  generated_at: '2026-10-09T10:03:29.000Z',
  expires_at: '2026-11-08T10:03:29.000Z',
  params: {
    range: '7d',
    from: '2026-10-02T10:00:00.000Z',
    to: '2026-10-09T10:00:00.000Z',
    connector_id: 'connector-1',
  },
  model: 'Anthropic Claude Sonnet 5',
  evidence: FIXTURE_EVIDENCE,
  brief: FIXTURE_BRIEF,
  ...overrides,
});
