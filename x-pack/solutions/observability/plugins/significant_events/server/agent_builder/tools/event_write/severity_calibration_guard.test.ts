/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent, SignalEntry } from '@kbn/significant-events-schema';
import { getCalibratedSeverity } from './severity_calibration_guard';

const detectionSignal = (
  ruleUuid: string,
  verdict: Extract<SignalEntry, { type: 'detection' }>['verdict'] = 'confirms'
): Extract<SignalEntry, { type: 'detection' }> => ({
  type: 'detection',
  stream_name: 'logs.test',
  description: `Signal for ${ruleUuid}`,
  verdict,
  metadata: {
    detection_id: `detection-${ruleUuid}`,
    rule_uuid: ruleUuid,
    change_point_type: 'spike',
    p_value: 0.01,
  },
});

const makeEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent =>
  ({
    '@timestamp': '2026-01-01T00:00:00.000Z',
    event_uuid: 'event-uuid',
    event_id: 'event-id',
    status: 'active',
    severity: 'medium',
    stream_names: ['logs.test'],
    title: 'Test event',
    summary: 'Test summary',
    confidence: 0.8,
    signals: [detectionSignal('rule-1')],
    investigations: [
      {
        workflow_execution_id: 'workflow-1',
        started_at: '2026-01-01T00:00:00.000Z',
        completed_at: '2026-01-01T01:00:00.000Z',
      },
    ],
    ...overrides,
  } as SignificantEvent);

const calibrate = (overrides: Partial<Parameters<typeof getCalibratedSeverity>[0]> = {}) =>
  getCalibratedSeverity({
    source: 'discovery',
    latestEvent: makeEvent(),
    proposedSeverity: 'high',
    proposedStatus: 'active',
    proposedSignals: [detectionSignal('rule-1')],
    ...overrides,
  });

describe('getCalibratedSeverity', () => {
  it.each([
    ['a new event', { latestEvent: undefined }],
    ['a source-less write', { source: undefined }],
    ['an event without investigations', { latestEvent: makeEvent({ investigations: undefined }) }],
    [
      'an event with only a pending investigation',
      {
        latestEvent: makeEvent({
          investigations: [
            {
              workflow_execution_id: 'workflow-1',
              started_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
      },
    ],
  ])('keeps the proposed severity for %s', (_, overrides) => {
    expect(calibrate(overrides)).toBe('high');
  });

  it.each(['high', 'low'] as const)(
    'preserves the current severity when Discovery proposes %s for a known rule',
    (proposedSeverity) => {
      expect(calibrate({ proposedSeverity })).toBe('medium');
    }
  );

  it('does not unlock for a new rule that is not confirmed', () => {
    expect(calibrate({ proposedSignals: [detectionSignal('rule-2', 'inconclusive')] })).toBe(
      'medium'
    );
  });

  it('accepts severity for a new confirmed rule', () => {
    expect(calibrate({ proposedSignals: [detectionSignal('rule-2')] })).toBe('high');
  });

  it('accepts severity on inactive status', () => {
    expect(calibrate({ proposedStatus: 'inactive' })).toBe('high');
  });

  it('accepts severity when reactivating an inactive event', () => {
    expect(calibrate({ latestEvent: makeEvent({ status: 'inactive' }) })).toBe('high');
  });

  it('uses an unlocked write as the baseline for the next continuation', () => {
    const newRule = detectionSignal('rule-2');
    const unlockedSeverity = calibrate({ proposedSignals: [newRule] });
    const newTip = makeEvent({
      severity: unlockedSeverity,
      signals: [detectionSignal('rule-1'), newRule],
    });

    expect(
      calibrate({
        latestEvent: newTip,
        proposedSeverity: 'critical',
        proposedSignals: [newRule],
      })
    ).toBe('high');
  });
});
