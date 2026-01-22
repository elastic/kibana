/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useTimelinePositions } from './use_timeline_positions';

describe('useTimelinePositions', () => {
  const referenceTime = new Date('2026-01-15T12:00:00Z');
  const totalRangeMs = 2 * 60 * 60 * 1000;
  const minGranularityMs = 5 * 60 * 1000;

  it('converts time to position correctly', () => {
    const { result } = renderHook(() =>
      useTimelinePositions({
        referenceTime,
        totalRangeMs,
        minGranularityMs,
      })
    );

    const centerTime = referenceTime;
    const position = result.current.timeToPosition(centerTime);
    expect(position).toBe(0.5);
  });

  it('converts position to time correctly', () => {
    const { result } = renderHook(() =>
      useTimelinePositions({
        referenceTime,
        totalRangeMs,
        minGranularityMs,
      })
    );

    const time = result.current.positionToTime(0.5);
    expect(time.getTime()).toBe(referenceTime.getTime());
  });

  it('snaps time to grid', () => {
    const { result } = renderHook(() =>
      useTimelinePositions({
        referenceTime,
        totalRangeMs,
        minGranularityMs,
      })
    );

    const unsnapppedTime = new Date('2026-01-15T12:03:00Z');
    const snapped = result.current.snapToGrid(unsnapppedTime);

    expect(snapped.getMinutes() % 5).toBe(0);
  });

  it('calculates relative minutes correctly', () => {
    const { result } = renderHook(() =>
      useTimelinePositions({
        referenceTime,
        totalRangeMs,
        minGranularityMs,
      })
    );

    const thirtyMinutesAfter = new Date('2026-01-15T12:30:00Z');
    const relativeMinutes = result.current.getRelativeMinutes(thirtyMinutesAfter);
    expect(relativeMinutes).toBe(30);
  });

  it('handles boundary positions', () => {
    const { result } = renderHook(() =>
      useTimelinePositions({
        referenceTime,
        totalRangeMs,
        minGranularityMs,
      })
    );

    const startTime = new Date(referenceTime.getTime() - totalRangeMs / 2);
    const endTime = new Date(referenceTime.getTime() + totalRangeMs / 2);

    expect(result.current.timeToPosition(startTime)).toBe(0);
    expect(result.current.timeToPosition(endTime)).toBe(1);
  });
});
