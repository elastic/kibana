/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  filterOccurrencesForDetection,
  getChangePointLabel,
  getDetectionOccurrenceTimeRange,
} from './change_point';

describe('getChangePointLabel', () => {
  it('returns Unknown for missing or invalid types', () => {
    expect(getChangePointLabel()).toBe('Unknown');
    expect(getChangePointLabel('not-a-real-type' as 'spike')).toBe('Unknown');
  });

  it('returns a label for known change-point types', () => {
    expect(getChangePointLabel('spike')).toBe('Spike');
  });
});

describe('getDetectionOccurrenceTimeRange', () => {
  it('frames occurrence data around the detection timestamp', () => {
    expect(getDetectionOccurrenceTimeRange('2026-07-10T12:00:00Z')).toEqual({
      from: new Date('2026-07-10T11:00:00Z').getTime(),
      to: new Date('2026-07-10T12:15:00Z').getTime(),
    });
  });

  it('returns undefined for an invalid timestamp', () => {
    expect(getDetectionOccurrenceTimeRange('invalid')).toBeUndefined();
  });
});

describe('filterOccurrencesForDetection', () => {
  it('keeps only points in the detection time window', () => {
    const occurrences = [
      { x: new Date('2026-07-10T10:55:00Z').getTime(), y: 1 },
      { x: new Date('2026-07-10T11:00:00Z').getTime(), y: 2 },
      { x: new Date('2026-07-10T12:15:00Z').getTime(), y: 3 },
      { x: new Date('2026-07-10T12:20:00Z').getTime(), y: 4 },
    ];

    expect(filterOccurrencesForDetection(occurrences, '2026-07-10T12:00:00Z')).toEqual([
      occurrences[1],
      occurrences[2],
    ]);
  });
});
