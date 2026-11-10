/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import { useCallback, useEffect, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { DEFAULT_DETECTION_TIME_RANGE, PAGE_QUERY_PARAM } from './constants';

export const RANGE_FROM_QUERY_PARAM = 'rangeFrom';
export const RANGE_TO_QUERY_PARAM = 'rangeTo';

export interface DetectionTimeRange {
  from: string;
  to: string;
}

const isValidDate = (value: string | null, roundUp: boolean): value is string =>
  value != null && dateMath.parse(value, { roundUp })?.isValid() === true;

const getTimeRange = (params: URLSearchParams): DetectionTimeRange => {
  const from = params.get(RANGE_FROM_QUERY_PARAM);
  const to = params.get(RANGE_TO_QUERY_PARAM);

  // A hand-edited or stale URL falls back to the default rather than failing every request.
  return isValidDate(from, false) && isValidDate(to, true)
    ? { from, to }
    : DEFAULT_DETECTION_TIME_RANGE;
};

export const useDetectionTimeRange = (): {
  timeRange: DetectionTimeRange;
  setTimeRange: (timeRange: DetectionTimeRange) => void;
} => {
  const history = useHistory();
  const { pathname, search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const timeRange = useMemo(() => getTimeRange(params), [params]);

  useEffect(() => {
    if (
      params.get(RANGE_FROM_QUERY_PARAM) === timeRange.from &&
      params.get(RANGE_TO_QUERY_PARAM) === timeRange.to
    ) {
      return;
    }

    const nextParams = new URLSearchParams(params);
    nextParams.set(RANGE_FROM_QUERY_PARAM, timeRange.from);
    nextParams.set(RANGE_TO_QUERY_PARAM, timeRange.to);
    history.replace({ pathname, search: nextParams.toString() });
  }, [history, params, pathname, timeRange]);

  const setTimeRange = useCallback(
    (nextTimeRange: DetectionTimeRange) => {
      // A refresh resubmits the same range; don't add a duplicate history entry.
      if (nextTimeRange.from === timeRange.from && nextTimeRange.to === timeRange.to) {
        return;
      }
      const nextParams = new URLSearchParams(search);
      nextParams.set(RANGE_FROM_QUERY_PARAM, nextTimeRange.from);
      nextParams.set(RANGE_TO_QUERY_PARAM, nextTimeRange.to);
      nextParams.delete(PAGE_QUERY_PARAM);
      history.push({ pathname, search: nextParams.toString() });
    },
    [history, pathname, search, timeRange]
  );

  return { timeRange, setTimeRange };
};
