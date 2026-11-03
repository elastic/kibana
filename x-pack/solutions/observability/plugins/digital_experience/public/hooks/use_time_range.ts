/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import qs from 'query-string';
import { getDateRange } from '@kbn/timerange';
import { useDigitalExperienceParams } from './use_digital_experience_params';
import { useKibanaServices } from './use_kibana_services';

/** Relative or absolute bounds, e.g. `{ rangeFrom: 'now-15m', rangeTo: 'now' }`. */
export interface TimeRange {
  rangeFrom: string;
  rangeTo: string;
}

// Sorted like the typed router's links, so a breadcrumb to this page matches the URL exactly.
const withTimeRange = (search: string, timeRange: TimeRange): string =>
  qs.stringify({ ...qs.parse(search), ...timeRange });

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
  const history = useHistory();
  const location = useLocation();

  const { from, to } = timefilter.getTime();
  const rangeFrom = query.rangeFrom ?? from;
  const rangeTo = query.rangeTo ?? to;
  const timeRange = useMemo(() => ({ rangeFrom, rangeTo }), [rangeFrom, rangeTo]);
  const isTimeRangeInUrl = query.rangeFrom !== undefined && query.rangeTo !== undefined;

  const setTimeRange = useCallback(
    (nextTimeRange: TimeRange) => {
      // Only `search` changes; the path, hash and history state are kept.
      history.push({ ...location, search: withTimeRange(location.search, nextTimeRange) });
    },
    [history, location]
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
  const history = useHistory();
  const location = useLocation();
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
    history.replace({
      ...location,
      search: withTimeRange(location.search, { rangeFrom: from, rangeTo: to }),
    });
  }, [hasValidTimeRange, timefilter, history, location]);

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
