/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Brief } from '../../../../../../common/entity_analytics/executive_brief/brief';
import type {
  Evidence,
  Fact,
} from '../../../../../../common/entity_analytics/executive_brief/evidence';

export const ROD = 'user:a.rodriguez@corp';
const LAPTOP = 'host:laptop-fin03';
export const DOCKER = 'host:docker-host-prod-01';
const CHEN = 'user:j.chen';

/**
 * - F-1: open critical attack discovery on ROD (privileged user), LAPTOP and DOCKER, 12 alerts.
 * - F-2: acknowledged high attack discovery on CHEN, 3 alerts.
 * - F-3: ROD at critical risk (92.5).
 * - L-1: ROD and DOCKER are part of the same discovered attack (backed by F-1).
 */
export const FIXTURE_EVIDENCE: Evidence = {
  entities: {
    [ROD]: {
      entity: {
        id: ROD,
        name: 'a.rodriguez',
        type: 'user',
        attributes: { watchlists: ['privileged-user-monitoring-watchlist-id-default'] },
        risk: { calculated_level: 'Critical', calculated_score_norm: 92.5 },
      },
      user: { name: 'a.rodriguez' },
    },
    [LAPTOP]: { entity: { id: LAPTOP, name: 'laptop-fin03', type: 'host' } },
    [DOCKER]: {
      entity: {
        id: DOCKER,
        name: 'docker-host-prod-01',
        type: 'host',
        risk: { calculated_level: 'High', calculated_score_norm: 71 },
      },
      asset: { criticality: 'extreme_impact' },
    },
    [CHEN]: { entity: { id: CHEN, name: 'j.chen', type: 'user' } },
  },
  facts: [
    {
      id: 'F-1',
      kind: 'attack_discovery',
      signalId: 'attack_discoveries',
      title: 'Stolen privileged credentials used to reach docker-host-prod-01',
      at: '2026-10-07T08:31:00.000Z',
      severity: 'critical',
      entities: [ROD, LAPTOP, DOCKER],
      numbers: { alerts: 12 },
      details: { status: 'open', tactics: 'Initial Access, Lateral Movement' },
      source: { type: 'attack_discovery', id: '8f14e45f-ceea-467a-9575-0b2f0d8c7a11' },
    },
    {
      id: 'F-2',
      kind: 'attack_discovery',
      signalId: 'attack_discoveries',
      title: 'Suspicious mailbox rule created by j.chen',
      at: '2026-10-08T12:00:00.000Z',
      severity: 'high',
      entities: [CHEN],
      numbers: { alerts: 3 },
      details: { status: 'acknowledged' },
    },
    {
      id: 'F-3',
      kind: 'high_risk_entity',
      signalId: 'high_risk_entities',
      title: 'a.rodriguez is at Critical risk',
      severity: 'critical',
      entities: [ROD],
      numbers: { riskScore: 92.5 },
    },
  ],
  links: [{ id: 'L-1', type: 'same_attack', from: ROD, to: DOCKER, factIds: ['F-1'] }],
  signals: [
    {
      id: 'attack_discoveries',
      title: 'Attack discoveries',
      capability: 'attack_discovery',
      status: 'ok',
      durationMs: 120,
      factCount: 2,
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
  ],
};

/** FIXTURE_EVIDENCE with the facts replaced or extended. */
export const withFacts = (update: (facts: Fact[]) => Fact[]): Evidence => ({
  ...FIXTURE_EVIDENCE,
  facts: update(FIXTURE_EVIDENCE.facts),
});

/** A brief that passes every check against FIXTURE_EVIDENCE. */
export const buildValidBrief = (): Brief => ({
  verdict: {
    level: 'urgent',
    headline: 'A privileged account was used to reach a critical production host',
    summary:
      'An open critical attack discovery covers user:a.rodriguez@corp, host:laptop-fin03 and host:docker-host-prod-01 with 12 alerts. user:a.rodriguez@corp has a risk score of 92.5.',
    evidence: ['F-1', 'F-3'],
  },
  areas: [
    {
      id: 'threats',
      level: 'urgent',
      summary: 'One critical attack involves a privileged user and a production host.',
      evidence: ['F-1', 'L-1'],
    },
    {
      id: 'response',
      level: 'action',
      summary: 'The critical attack is not acknowledged yet; the high one on user:j.chen is.',
      evidence: ['F-1', 'F-2'],
    },
  ],
});
