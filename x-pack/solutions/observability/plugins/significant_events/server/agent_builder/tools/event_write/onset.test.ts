/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangePointType, Detection, SignalEntry } from '@kbn/significant-events-schema';
import { eventOnsetOf } from './onset';

const signal = (detectionId: string, verdict = 'confirms'): SignalEntry =>
  ({ verdict, metadata: { detection_id: detectionId } } as SignalEntry);

const detection = (
  writtenAt: string,
  changePointType: ChangePointType,
  changePointAt?: string
): Pick<Detection, '@timestamp' | 'change_point_at' | 'change_point_type'> => ({
  '@timestamp': writtenAt,
  change_point_type: changePointType,
  ...(changePointAt ? { change_point_at: changePointAt } : {}),
});

const detections = new Map([
  ['slow', detection('2026-11-26T10:20:00.000Z', 'step_change', '2026-11-26T10:00:00.000Z')],
  ['fast', detection('2026-11-26T10:05:00.000Z', 'spike', '2026-11-26T10:02:00.000Z')],
  ['unstable', detection('2026-11-26T09:50:00.000Z', 'non_stationary')],
  ['early', detection('2026-11-26T09:40:00.000Z', 'dip', '2026-11-26T09:30:00.000Z')],
]);

describe('eventOnsetOf', () => {
  it('takes the earliest change point with its type, and the earliest write', () => {
    expect(
      eventOnsetOf({ signals: [signal('slow'), signal('fast'), signal('unstable')], detections })
    ).toEqual({
      onset_at: '2026-11-26T10:00:00.000Z',
      onset_source: 'change_point',
      onset_change_point_type: 'step_change',
      detected_at: '2026-11-26T10:05:00.000Z',
    });
  });

  it('ignores a signal that does not confirm when another does', () => {
    expect(
      eventOnsetOf({ signals: [signal('fast'), signal('early', 'refutes')], detections })?.onset_at
    ).toBe('2026-11-26T10:02:00.000Z');
  });

  it('falls back to every signal when none confirms', () => {
    expect(eventOnsetOf({ signals: [signal('early', 'off_topic')], detections })?.onset_at).toBe(
      '2026-11-26T09:30:00.000Z'
    );
  });

  it('is empty when no detection carries a change point', () => {
    expect(eventOnsetOf({ signals: [signal('unstable'), signal('unknown')], detections })).toBe(
      undefined
    );
  });
});
