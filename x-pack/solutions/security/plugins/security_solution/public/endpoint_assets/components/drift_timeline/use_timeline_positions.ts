/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useCallback } from 'react';
import { TIMELINE_DEFAULTS } from './constants';

interface UseTimelinePositionsProps {
  referenceTime: Date;
  totalRangeMs?: number;
  minGranularityMs?: number;
}

interface TimelinePositionHelpers {
  timeToPosition: (time: Date) => number;
  positionToTime: (position: number) => Date;
  snapToGrid: (time: Date) => Date;
  getRelativeMinutes: (time: Date) => number;
}

export const useTimelinePositions = ({
  referenceTime,
  totalRangeMs = TIMELINE_DEFAULTS.TOTAL_RANGE_MS,
  minGranularityMs = TIMELINE_DEFAULTS.MIN_GRANULARITY_MS,
}: UseTimelinePositionsProps): TimelinePositionHelpers => {
  // referenceTime is "now" - the end of the timeline
  const nowMs = useMemo(() => referenceTime.getTime(), [referenceTime]);
  const startMs = useMemo(() => nowMs - totalRangeMs, [nowMs, totalRangeMs]);

  // Position 0 = start (24h ago), Position 1 = now
  const timeToPosition = useCallback(
    (time: Date): number => {
      const timeMs = time.getTime();
      const position = (timeMs - startMs) / totalRangeMs;
      return Math.max(0, Math.min(1, position));
    },
    [startMs, totalRangeMs]
  );

  const positionToTime = useCallback(
    (position: number): Date => {
      const timeMs = startMs + position * totalRangeMs;
      return new Date(timeMs);
    },
    [startMs, totalRangeMs]
  );

  const snapToGrid = useCallback(
    (time: Date): Date => {
      const timeMs = time.getTime();
      const snappedMs = Math.round(timeMs / minGranularityMs) * minGranularityMs;
      return new Date(snappedMs);
    },
    [minGranularityMs]
  );

  // Returns minutes relative to "now" (negative = past)
  const getRelativeMinutes = useCallback(
    (time: Date): number => {
      const offsetMs = time.getTime() - nowMs;
      return Math.round(offsetMs / (60 * 1000));
    },
    [nowMs]
  );

  return {
    timeToPosition,
    positionToTime,
    snapToGrid,
    getRelativeMinutes,
  };
};
