/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { SignalEntry, SignificantEvent } from '@kbn/significant-events-schema';
import {
  buildEventStatusChangedProps,
  reportEventStatusChange,
} from './event_status_change_telemetry';

const signal = (verdict: SignalEntry['verdict'], ruleUuid: string): SignalEntry =>
  ({
    type: 'detection',
    verdict,
    metadata: { rule_uuid: ruleUuid },
  } as SignalEntry);

const event = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  event_id: 'checkout-latency',
  status: 'active',
  severity: 'high',
  confidence: 0.8,
  source_ids: ['logs.checkout', 'logs.payments'],
  title: 'Checkout latency',
  summary: 'Checkout is slow',
  signals: [
    signal('confirms', 'rule-a'),
    signal('refutes', 'rule-b'),
    signal('confirms', 'rule-c'),
  ],
  ...overrides,
});

describe('buildEventStatusChangedProps', () => {
  it('describes a creation without a previous status', () => {
    expect(
      buildEventStatusChangedProps({
        event: event({ workflow_execution_id: 'wf-exec-1' }),
        prior: undefined,
        actor: 'agent',
        spaceId: 'ops',
      })
    ).toEqual({
      alert_source: 'elastic.significant_events',
      fingerprint: 'checkout-latency',
      space_id: 'ops',
      entity_type: 'significant_event',
      status: 'active',
      actor: 'agent',
      severity: 'high',
      confidence: 0.8,
      signal_count: 3,
      confirmed_signal_count: 2,
      source_ids: ['logs.checkout', 'logs.payments'],
      workflow_execution_id: 'wf-exec-1',
    });
  });

  it('describes a transition with the previous status', () => {
    const props = buildEventStatusChangedProps({
      event: event({ status: 'inactive', severity: 'low', signals: undefined }),
      prior: { status: 'recovering' },
      actor: 'human',
      spaceId: 'default',
    });

    expect(props).toMatchObject({
      previous_status: 'recovering',
      status: 'inactive',
      actor: 'human',
      severity: 'low',
      signal_count: 0,
      confirmed_signal_count: 0,
    });
    expect(props).not.toHaveProperty('workflow_execution_id');
  });

  it('returns nothing when the status is unchanged', () => {
    expect(
      buildEventStatusChangedProps({
        event: event({ status: 'active', severity: 'critical' }),
        prior: { status: 'active' },
        actor: 'agent',
        spaceId: 'default',
      })
    ).toBeUndefined();
  });
});

describe('reportEventStatusChange', () => {
  const change = {
    event: event(),
    prior: undefined,
    actor: 'system' as const,
    spaceId: 'default',
  };

  it('does nothing without a telemetry client', () => {
    expect(() => reportEventStatusChange({ telemetry: undefined, ...change })).not.toThrow();
  });

  it('swallows a telemetry failure', () => {
    const logger = loggerMock.create();
    const telemetry = {
      trackEventStatusChanged: jest.fn(() => {
        throw new Error('analytics down');
      }),
    };

    expect(() => reportEventStatusChange({ telemetry, logger, ...change })).not.toThrow();
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('analytics down'));
  });
});
