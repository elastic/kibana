/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { getDateRange } from '@kbn/timerange';
import { useDigitalExperienceParams } from './use_digital_experience_params';
import { useKibanaServices } from './use_kibana_services';
import { useUpdateUrlQuery } from './use_update_url_query';

/** Relative or absolute bounds, e.g. `{ rangeFrom: 'now-15m', rangeTo: 'now' }`. */
export interface TimeRange {
  rangeFrom: string;
  rangeTo: string;
}

/**
 * Whether both bounds parse as dates, e.g. `now-15m` or an ISO date, and the range starts before it
 * ends; unlike `rangeFrom=foo` or a reversed range.
 */
export const isValidTimeRange = ({ rangeFrom, rangeTo }: TimeRange): boolean => {
  try {
    const { startDate, endDate } = getDateRange({ from: rangeFrom, to: rangeTo });
    return startDate < endDate;
  } catch {
    return false;
  }
};

/**
 * Time range from the `rangeFrom` / `rangeTo` URL params, falling back to the global timefilter;
 * `setTimeRange` updates the URL, and `useSyncTimeRange` mirrors it into the timefilter.
 */
export const useTimeRange = (): {
  timeRange: TimeRange;
  isTimeRangeInUrl: boolean;
  setTimeRange: (timeRange: TimeRange) => void;
} => {
  const { data } = useKibanaServices();
  const { timefilter } = data.query.timefilter;
  const { query } = useDigitalExperienceParams('/');
  const updateUrlQuery = useUpdateUrlQuery();

  const { from, to } = timefilter.getTime();
  const rangeFrom = query.rangeFrom ?? from;
  const rangeTo = query.rangeTo ?? to;
  const timeRange = useMemo(() => ({ rangeFrom, rangeTo }), [rangeFrom, rangeTo]);
  const isTimeRangeInUrl = query.rangeFrom !== undefined && query.rangeTo !== undefined;

  const setTimeRange = useCallback(
    (nextTimeRange: TimeRange) => updateUrlQuery({ ...nextTimeRange }),
    [updateUrlQuery]
  );

  return { timeRange, isTimeRangeInUrl, setTimeRange };
};

/**
 * Puts the timefilter's range into a URL with a missing or invalid one, and mirrors the URL's range
 * into the timefilter; returns whether the URL has a valid range, so the page can wait for it.
 */
export const useSyncTimeRange = (): boolean => {
  const { data } = useKibanaServices();
  const { timefilter } = data.query.timefilter;
  const updateUrlQuery = useUpdateUrlQuery();
  const { timeRange, isTimeRangeInUrl } = useTimeRange();
  const hasValidTimeRange = isTimeRangeInUrl && isValidTimeRange(timeRange);

  // `replace`, so Back doesn't return to the URL without a range.
  useEffect(() => {
    if (hasValidTimeRange) {
      return;
    }
    const current = timefilter.getTime();
    const { from, to } = isValidTimeRange({ rangeFrom: current.from, rangeTo: current.to })
      ? current
      : timefilter.getTimeDefaults();
    updateUrlQuery({ rangeFrom: from, rangeTo: to }, { replace: true });
  }, [hasValidTimeRange, timefilter, updateUrlQuery]);

  useEffect(() => {
    if (!hasValidTimeRange) {
      return;
    }
    const { from, to } = timefilter.getTime();
    if (from !== timeRange.rangeFrom || to !== timeRange.rangeTo) {
      timefilter.setTime({ from: timeRange.rangeFrom, to: timeRange.rangeTo });
    }
  }, [hasValidTimeRange, timefilter, timeRange]);

  return hasValidTimeRange;
};
