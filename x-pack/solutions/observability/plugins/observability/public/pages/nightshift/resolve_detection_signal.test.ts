/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Discovery, LifecycleDetection, SignalEntry } from '@kbn/significant-events-schema';
import { findDetectionSignal } from './resolve_detection_signal';

const mockDetection = (overrides: Partial<LifecycleDetection> = {}): LifecycleDetection => ({
  detection_id: 'det-1',
  rule_name: 'latency-p95-spike',
  rule_uuid: 'rule-uuid-1',
  stream_name: 'logs.web-frontend',
  change_point_type: 'spike',
  '@timestamp': '2026-07-10T12:00:00Z',
  ...overrides,
});

const mockSignalMetadata = {
  detection_id: 'det-1',
  rule_uuid: 'rule-uuid-1',
  rule_name: 'latency-p95-spike',
  change_point_type: 'spike' as const,
  p_value: 0.01,
};

const mockSignal = (overrides: Partial<SignalEntry> = {}): SignalEntry => ({
  type: 'detection',
  stream_name: 'logs.web-frontend',
  description: 'Latency spike detected',
  evidence: { esql_query: 'FROM logs | LIMIT 1', result: 'found' },
  metadata: mockSignalMetadata,
  ...overrides,
});

const mockDiscovery = (overrides: Partial<Discovery> = {}): Discovery => ({
  '@timestamp': '2026-07-10T12:00:00Z',
  kind: 'discovery',
  discovery_id: 'disc-1',
  event_id: 'evt-1',
  processed: false,
  title: 'Web latency spike',
  summary: 'Latency increased on web-frontend.',
  severity: '60-high',
  confidence: 0.9,
  stream_names: ['logs.web-frontend'],
  ...overrides,
});

describe('findDetectionSignal', () => {
  it('matches by detection_id and stream_name', () => {
    const signal = mockSignal();
    expect(findDetectionSignal(mockDetection(), { eventSignals: [signal] })).toEqual(signal);
  });

  it('does not match a different detection_id on the same stream', () => {
    const signal = mockSignal({
      metadata: {
        ...mockSignalMetadata,
        detection_id: 'det-other',
      },
    });
    expect(findDetectionSignal(mockDetection(), { eventSignals: [signal] })).toBeUndefined();
  });

  it('does not match when stream_name differs', () => {
    const signal = mockSignal({ stream_name: 'logs.api-gateway' });
    expect(findDetectionSignal(mockDetection(), { eventSignals: [signal] })).toBeUndefined();
  });

  it('prefers discovery signals over list payload signals', () => {
    const discoverySignal = mockSignal({ description: 'from discovery' });
    const eventSignal = mockSignal({ description: 'from event list' });

    expect(
      findDetectionSignal(mockDetection(), {
        discoveries: [
          mockDiscovery({
            signals: [discoverySignal],
          }),
        ],
        eventSignals: [eventSignal],
      })
    ).toEqual(discoverySignal);
  });
});
