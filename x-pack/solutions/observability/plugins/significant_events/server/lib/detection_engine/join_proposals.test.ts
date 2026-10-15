/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EngineEvent } from '../../../common/detection_engine/types';
import { proposeJoins } from './join_proposals';

function openEvent(eventId: string, services: string[], openedAt: string): EngineEvent {
  return {
    event_id: eventId,
    space_id: 'default',
    title: eventId,
    summary: '',
    severity: 'high',
    status: 'active',
    services,
    members: [],
    origin_strategy: 'health_checks',
    episode: 1,
    created_at: openedAt,
    opened_at: openedAt,
    updated_at: openedAt,
    open_windows: [{ from: openedAt }],
  };
}

const DEPENDENCIES = [
  { source: 'frontend', target: 'checkout' },
  { source: 'checkout', target: 'payments' },
];

describe('proposeJoins', () => {
  it('ranks the same service before a dependency', () => {
    const proposals = proposeJoins({
      service: 'checkout',
      at: '2026-10-15T10:10:00.000Z',
      openEvents: [
        openEvent('payments-down', ['payments'], '2026-10-15T10:08:00.000Z'),
        openEvent('checkout-errors', ['checkout'], '2026-10-15T10:00:00.000Z'),
      ],
      dependencies: DEPENDENCIES,
      joinWindowMinutes: 60,
    });

    expect(proposals.map((proposal) => proposal.event.event_id)).toEqual([
      'checkout-errors',
      'payments-down',
    ]);
    expect(proposals[1].reason).toBe('checkout calls payments, which is in this event');
  });

  it('proposes nothing for an unrelated service', () => {
    expect(
      proposeJoins({
        service: 'inventory',
        at: '2026-10-15T10:10:00.000Z',
        openEvents: [openEvent('payments-down', ['payments'], '2026-10-15T10:08:00.000Z')],
        dependencies: DEPENDENCIES,
        joinWindowMinutes: 60,
      })
    ).toEqual([]);
  });

  it('ignores events opened outside the join window', () => {
    expect(
      proposeJoins({
        service: 'payments',
        at: '2026-10-15T12:00:00.000Z',
        openEvents: [openEvent('payments-down', ['payments'], '2026-10-15T10:00:00.000Z')],
        dependencies: DEPENDENCIES,
        joinWindowMinutes: 60,
      })
    ).toEqual([]);
  });

  it("measures the window from the event's latest signal, not from when it opened", () => {
    const longRunning = openEvent('payments-down', ['payments'], '2026-10-15T08:00:00.000Z');
    longRunning.members = [
      {
        fingerprint: 'health:error_ratio:lab:payments',
        strategy: 'health_checks',
        service: 'payments',
        title: 'payments errors',
        latest_detection_id: 'd1',
        value: 0.4,
        peak_value: 0.4,
        unit: 'ratio',
        importance: 80,
        evidence_esql: 'FROM logs',
        healthy: false,
        healthy_streak: 0,
        first_seen: '2026-10-15T08:00:00.000Z',
        last_seen: '2026-10-15T11:55:00.000Z',
        joined_at: '2026-10-15T08:00:00.000Z',
        join_reason: 'first detection',
      },
    ];

    const [proposal] = proposeJoins({
      service: 'payments',
      at: '2026-10-15T12:00:00.000Z',
      openEvents: [longRunning],
      dependencies: DEPENDENCIES,
      joinWindowMinutes: 60,
    });

    expect(proposal.minutesApart).toBe(5);
  });

  it('names the caller when the detection is upstream of the event', () => {
    const [proposal] = proposeJoins({
      service: 'payments',
      at: '2026-10-15T10:10:00.000Z',
      openEvents: [openEvent('checkout-errors', ['checkout'], '2026-10-15T10:05:00.000Z')],
      dependencies: DEPENDENCIES,
      joinWindowMinutes: 60,
    });

    expect(proposal.relation).toBe('upstream');
    expect(proposal.reason).toBe('checkout, which is in this event, calls payments');
  });
});
