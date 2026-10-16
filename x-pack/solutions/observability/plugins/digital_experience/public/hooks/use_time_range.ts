/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import qs from 'query-string';
import { useDigitalExperienceParams } from './use_digital_experience_params';
import { useKibanaServices } from './use_kibana_services';

/** Relative or absolute bounds, e.g. `{ rangeFrom: 'now-15m', rangeTo: 'now' }`. */
export interface TimeRange {
  rangeFrom: string;
  rangeTo: string;
}

/** `search` with the time range set and the other params kept, encoded like the typed router's links. */
const withTimeRange = (search: string, timeRange: TimeRange): string =>
  qs.stringify({ ...qs.parse(search), ...timeRange }, { sort: false });

/**
 * The time range of the app: the `rangeFrom` / `rangeTo` query params of the root route, falling
 * back to the global timefilter. `setTimeRange` updates the URL and the timefilter.
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
  const { pathname, search } = useLocation();

  const { from, to } = timefilter.getTime();
  const rangeFrom = query.rangeFrom ?? from;
  const rangeTo = query.rangeTo ?? to;
  const timeRange = useMemo(() => ({ rangeFrom, rangeTo }), [rangeFrom, rangeTo]);
  const isTimeRangeInUrl = query.rangeFrom !== undefined && query.rangeTo !== undefined;

  const setTimeRange = useCallback(
    (nextTimeRange: TimeRange) => {
      timefilter.setTime({ from: nextTimeRange.rangeFrom, to: nextTimeRange.rangeTo });
      history.push({ pathname, search: withTimeRange(search, nextTimeRange) });
    },
    [timefilter, history, pathname, search]
  );

  return { timeRange, isTimeRangeInUrl, setTimeRange };
};

/**
 * Keeps the URL and the global timefilter in sync with the app time range. Used once, by the root
 * route: it writes the range into a URL that has none (so reloads and shared links keep it) and
 * mirrors the URL range into the timefilter (so other Kibana apps open with the same range).
 */
export const useSyncTimeRange = (): void => {
  const { data } = useKibanaServices();
  const { timefilter } = data.query.timefilter;
  const history = useHistory();
  const { pathname, search } = useLocation();
  const { timeRange, isTimeRangeInUrl } = useTimeRange();

  useEffect(() => {
    if (!isTimeRangeInUrl) {
      history.replace({ pathname, search: withTimeRange(search, timeRange) });
    }
  }, [history, pathname, search, timeRange, isTimeRangeInUrl]);

  useEffect(() => {
    timefilter.setTime({ from: timeRange.rangeFrom, to: timeRange.rangeTo });
  }, [timefilter, timeRange]);
};
