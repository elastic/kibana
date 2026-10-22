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

/** Whether both bounds parse as dates, e.g. `now-15m` or an ISO date, unlike `rangeFrom=foo`. */
export const isValidTimeRange = ({ rangeFrom, rangeTo }: TimeRange): boolean => {
  try {
    getDateRange({ from: rangeFrom, to: rangeTo });
    return true;
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

/** Writes the time range into a URL without one and mirrors a valid one into the global timefilter. */
export const useSyncTimeRange = (): void => {
  const { data } = useKibanaServices();
  const { timefilter } = data.query.timefilter;
  const history = useHistory();
  const location = useLocation();
  const { timeRange, isTimeRangeInUrl } = useTimeRange();

  // Also rewrites a URL in another form (e.g. unencoded `:` in dates) to the one links use, so the
  // breadcrumb to the current page matches it and no back button shows.
  useEffect(() => {
    const search = withTimeRange(location.search, timeRange);
    if (!isTimeRangeInUrl || location.search.replace(/^\?/, '') !== search) {
      history.replace({ ...location, search });
    }
  }, [history, location, timeRange, isTimeRangeInUrl]);

  // An invalid range would be stored in the timefilter and its "Recently used" list.
  useEffect(() => {
    if (isValidTimeRange(timeRange)) {
      timefilter.setTime({ from: timeRange.rangeFrom, to: timeRange.rangeTo });
    }
  }, [timefilter, timeRange]);
};
