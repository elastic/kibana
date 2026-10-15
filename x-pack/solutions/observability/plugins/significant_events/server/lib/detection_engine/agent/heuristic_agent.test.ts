/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHeuristicAgent } from './heuristic_agent';
import type { AgentCase, CaseEvidence } from './types';

function evidence(id: string, fingerprint: string, rows: CaseEvidence['rows']): CaseEvidence {
  return {
    id,
    fingerprint,
    title: fingerprint,
    unit: 'ratio',
    query: 'FROM logs',
    result: rows.length ? 'found' : 'empty',
    rows,
  };
}

const PAYMENTS_EVENT: AgentCase['event'] = {
  event_id: 'event-1',
  title: 'payments error ratio is 45%',
  summary: 'Payments fails.',
  severity: 'high',
  status: 'active',
  services: ['payments'],
  members: [{ title: 'payments errors', service: 'payments', strategy: 'health_checks' }],
};

function joinCase({
  service,
  ownRows,
  eventRows,
  relation,
}: {
  service: string;
  ownRows: CaseEvidence['rows'];
  eventRows: CaseEvidence['rows'];
  relation: string;
}): AgentCase {
  return {
    kind: 'join',
    detection: {
      fingerprint: `health:${service}`,
      strategy: 'health_checks',
      service,
      title: `${service} looks off`,
      description: '',
      value: 0.3,
      unit: 'ratio',
      importance: 70,
    },
    event: PAYMENTS_EVENT,
    join_proposal: { event_id: 'event-1', reason: 'dependency', relation, minutes_apart: 2 },
    evidence: [
      evidence('E1', `health:${service}`, ownRows),
      evidence('E2', 'health:payments', eventRows),
    ],
    firing_customer_alerts: [],
    related_services: ['payments'],
    memory: [],
  };
}

describe('createHeuristicAgent', () => {
  const agent = createHeuristicAgent();

  it('confirms a dependency join when the new rows name a service in the event', async () => {
    const answer = await agent.assess(
      joinCase({
        service: 'checkout',
        relation: 'downstream',
        ownRows: [
          { 'service.name': 'checkout', message: 'Call to payments failed: upstream timeout' },
        ],
        eventRows: [
          { 'service.name': 'payments', message: 'Payment gateway timeout after 3000ms' },
        ],
      })
    );

    expect(answer.join_decision).toBe('confirm');
  });

  it('confirms when the event rows name the new service', async () => {
    const answer = await agent.assess(
      joinCase({
        service: 'inventory',
        relation: 'upstream',
        ownRows: [{ bucket: '2026-10-15T10:00:00.000Z', docs: 0 }],
        eventRows: [{ 'service.name': 'payments', message: 'Call to inventory failed' }],
      })
    );

    expect(answer.join_decision).toBe('confirm');
  });

  it('vetoes a dependency join that no evidence row links', async () => {
    const answer = await agent.assess(
      joinCase({
        service: 'inventory',
        relation: 'upstream',
        ownRows: [{ bucket: '2026-10-15T10:00:00.000Z', p95_ms: 400 }],
        eventRows: [
          { 'service.name': 'payments', message: 'Payment gateway timeout after 3000ms' },
        ],
      })
    );

    expect(answer.join_decision).toBe('veto');
    expect(answer.join_reason).toBe(
      'Vetoed: dependency, but no evidence row names the other service, so a dependency alone does not make them one problem.'
    );
  });

  it('ignores the service.name column, which only says where the row came from', async () => {
    const answer = await agent.assess(
      joinCase({
        service: 'inventory',
        relation: 'upstream',
        ownRows: [{ 'service.name': 'inventory', message: 'slow' }],
        eventRows: [{ 'service.name': 'inventory', message: 'unrelated' }],
      })
    );

    expect(answer.join_decision).toBe('veto');
  });

  it('confirms the same service without needing a link', async () => {
    const answer = await agent.assess(
      joinCase({ service: 'payments', relation: 'same_service', ownRows: [], eventRows: [] })
    );

    expect(answer.join_decision).toBe('confirm');
  });
});
