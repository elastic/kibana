/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { DEFAULT_DETECTION_TIME_RANGE } from './constants';

const RANGE_FROM_QUERY_PARAM = 'rangeFrom';
const RANGE_TO_QUERY_PARAM = 'rangeTo';

export interface DetectionTimeRange {
  from: string;
  to: string;
}

export const useDetectionTimeRange = (): {
  timeRange: DetectionTimeRange;
  setTimeRange: (timeRange: DetectionTimeRange) => void;
} => {
  const history = useHistory();
  const { pathname, search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const timeRange = useMemo(
    () => ({
      from: params.get(RANGE_FROM_QUERY_PARAM) ?? DEFAULT_DETECTION_TIME_RANGE.from,
      to: params.get(RANGE_TO_QUERY_PARAM) ?? DEFAULT_DETECTION_TIME_RANGE.to,
    }),
    [params]
  );

  useEffect(() => {
    if (params.has(RANGE_FROM_QUERY_PARAM) && params.has(RANGE_TO_QUERY_PARAM)) {
      return;
    }

    const nextParams = new URLSearchParams(params);
    nextParams.set(RANGE_FROM_QUERY_PARAM, timeRange.from);
    nextParams.set(RANGE_TO_QUERY_PARAM, timeRange.to);
    history.replace({ pathname, search: nextParams.toString() });
  }, [history, params, pathname, timeRange]);

  const setTimeRange = useCallback(
    (nextTimeRange: DetectionTimeRange) => {
      const nextParams = new URLSearchParams(search);
      nextParams.set(RANGE_FROM_QUERY_PARAM, nextTimeRange.from);
      nextParams.set(RANGE_TO_QUERY_PARAM, nextTimeRange.to);
      history.push({ pathname, search: nextParams.toString() });
    },
    [history, pathname, search]
  );

  return { timeRange, setTimeRange };
};
