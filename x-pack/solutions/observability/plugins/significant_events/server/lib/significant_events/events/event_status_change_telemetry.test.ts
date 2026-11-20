/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent } from '@kbn/significant-events-schema';
import { StatusChange } from './lifecycle/lifecycle_controller';
import { buildEventStatusChangedProps } from './event_status_change_telemetry';

const event = (overrides: Partial<SignificantEvent> = {}): SignificantEvent =>
  ({
    '@timestamp': '2026-01-01T00:00:00.000Z',
    event_id: 'event-1',
    status: 'active',
    source_ids: ['source-1'],
    title: 'Test event',
    summary: 'Test summary',
    severity: 'high',
    confidence: 0.7,
    ...overrides,
  } as SignificantEvent);

describe('buildEventStatusChangedProps', () => {
  it('describes a lifecycle-decided transition with its fan-in', () => {
    const signals = [
      { verdict: 'confirms' },
      { verdict: 'refutes' },
      { verdict: 'confirms' },
    ] as unknown as SignificantEvent['signals'];

    expect(
      buildEventStatusChangedProps({
        event: event({ status: 'recovering', signals, workflow_execution_id: 'exec-1' }),
        prior: { status: 'active' },
        origin: { actor: 'agent_tool', change: StatusChange.assessed('recovered') },
        spaceId: 'space-a',
      })
    ).toEqual({
      alert_source: 'elastic.significant_events',
      fingerprint: 'event-1',
      space_id: 'space-a',
      entity_type: 'significant_event',
      previous_status: 'active',
      status: 'recovering',
      actor: 'agent_tool',
      change_kind: 'assessment',
      assessment_outcome: 'recovered',
      severity: 'high',
      confidence: 0.7,
      signal_count: 3,
      confirmed_signal_count: 2,
      source_ids: ['source-1'],
      workflow_execution_id: 'exec-1',
    });
  });

  it.each([
    ['inactive', 'dismissed'],
    ['active', undefined],
  ] as const)('carries the close reason only when closing: %s', (status, expected) => {
    const props = buildEventStatusChangedProps({
      event: event({ status }),
      prior: { status: 'recovering' },
      origin: {
        actor: 'rest_api',
        change: StatusChange.byOperator(status),
        closeReason: 'dismissed',
      },
      spaceId: 'space-a',
    });

    expect(props?.close_reason).toBe(expected);
  });
});
