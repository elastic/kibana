/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LifecycleDetection, SignalEntry } from '@kbn/significant-events-schema';
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

const mockEvent = (signals: SignalEntry[]) => ({ signals });

describe('findDetectionSignal', () => {
  it('matches by detection_id and stream_name', () => {
    const signal = mockSignal();
    expect(findDetectionSignal(mockDetection(), [mockEvent([signal])])).toEqual(signal);
  });

  it('does not match a different detection_id on the same stream', () => {
    const signal = mockSignal({
      metadata: {
        ...mockSignalMetadata,
        detection_id: 'det-other',
      },
    });
    expect(findDetectionSignal(mockDetection(), [mockEvent([signal])])).toBeUndefined();
  });

  it('does not match when stream_name differs', () => {
    const signal = mockSignal({ stream_name: 'logs.api-gateway' });
    expect(findDetectionSignal(mockDetection(), [mockEvent([signal])])).toBeUndefined();
  });

  it('uses the matching signal from the newest event version', () => {
    const latestSignal = mockSignal({ description: 'latest event version' });
    const olderSignal = mockSignal({ description: 'older event version' });

    expect(
      findDetectionSignal(mockDetection(), [mockEvent([olderSignal]), mockEvent([latestSignal])])
    ).toEqual(latestSignal);
  });
});
