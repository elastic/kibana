/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

export const TIME_RANGE_OPTIONS = ['24h', '7d', '30d'] as const;
export type TimeRange = (typeof TIME_RANGE_OPTIONS)[number];

const DEFAULT: TimeRange = '30d';
const PARAM_KEY = 'eaTimeRange';

const isValidTimeRange = (val: string | null): val is TimeRange =>
  TIME_RANGE_OPTIONS.includes(val as TimeRange);

/** Reads and writes `eaTimeRange` in the URL, redirecting to the default if missing or invalid. */
export const useTimeRangeParam = (): [TimeRange, (val: TimeRange) => void] => {
  const { search } = useLocation();
  const history = useHistory();

  useEffect(() => {
    const params = new URLSearchParams(history.location.search);
    if (!isValidTimeRange(params.get(PARAM_KEY))) {
      params.set(PARAM_KEY, DEFAULT);
      history.replace({ ...history.location, search: params.toString() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timeRange = useMemo(() => {
    const val = new URLSearchParams(search).get(PARAM_KEY);
    return isValidTimeRange(val) ? val : DEFAULT;
  }, [search]);

  const setTimeRange = useCallback(
    (val: TimeRange) => {
      const params = new URLSearchParams(history.location.search);
      params.set(PARAM_KEY, val);
      history.replace({ ...history.location, search: params.toString() });
    },
    [history]
  );

  return [timeRange, setTimeRange];
};
