/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { TimeRange } from '../../common/types';
import { getNextTimeRange } from '../utils/get_next_time_range';
import { useTimeRangeContext } from './use_time_range_context';

interface TimeRangeAPI {
  timeRangeId: string;
}

interface TimeRangeInSeconds {
  inSeconds: { start: number; end: number };
}
interface PartialTimeRangeInSeconds {
  inSeconds: Pick<Partial<TimeRangeInSeconds['inSeconds']>, 'start' | 'end'>;
}

type PartialTimeRange = Pick<Partial<TimeRange>, 'start' | 'end'>;

export function useTimeRange(range: {
  rangeFrom?: string;
  rangeTo?: string;
  optional: true;
}): TimeRangeAPI & PartialTimeRange & PartialTimeRangeInSeconds;

export function useTimeRange(range: {
  rangeFrom: string;
  rangeTo: string;
}): TimeRangeAPI & TimeRange & TimeRangeInSeconds;

export function useTimeRange({
  rangeFrom,
  rangeTo,
  optional,
}: {
  rangeFrom?: string;
  rangeTo?: string;
  optional?: boolean;
}): TimeRangeAPI &
  (TimeRange | PartialTimeRange) &
  (TimeRangeInSeconds | PartialTimeRangeInSeconds) {
  const timeRangeApi = useTimeRangeContext();

  const { start, end } = useMemo(() => {
    return getNextTimeRange({
      state: {},
      rangeFrom,
      rangeTo,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeFrom, rangeTo, timeRangeApi.timeRangeId]);

  if ((!start || !end) && !optional) {
    throw new Error('start and/or end were unexpectedly not set');
  }

  return {
    start,
    end,
    inSeconds: {
      start: start ? new Date(start).getTime() / 1000 : undefined,
      end: end ? new Date(end).getTime() / 1000 : undefined,
    },
    timeRangeId: timeRangeApi.timeRangeId,
  };
}
