/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import type { ClassicRumTimeRange } from '@kbn/ux-plugin/public';
import { useKibanaServices } from './use_kibana_services';

export type TimeRange = ClassicRumTimeRange;

const withTimeRange = (search: string, { rangeFrom, rangeTo }: TimeRange): string => {
  const params = new URLSearchParams(search);
  params.set('rangeFrom', rangeFrom);
  params.set('rangeTo', rangeTo);
  return `?${params.toString()}`;
};

/** Search string that carries a time range across DX links, e.g. `?rangeFrom=now-15m&rangeTo=now`. */
export const toTimeRangeSearch = (timeRange: TimeRange): string => withTimeRange('', timeRange);

/**
 * Time range kept in the URL as `rangeFrom` / `rangeTo` (the observability convention), falling
 * back to the global timefilter and mirrored into it so other apps pick it up.
 */
export const useTimeRange = (): {
  timeRange: TimeRange;
  setTimeRange: (timeRange: TimeRange) => void;
} => {
  const { data } = useKibanaServices();
  const { timefilter } = data.query.timefilter;
  const history = useHistory();
  const { pathname, search } = useLocation();

  const params = new URLSearchParams(search);
  const { from, to } = timefilter.getTime();
  const rangeFrom = params.get('rangeFrom') ?? from;
  const rangeTo = params.get('rangeTo') ?? to;
  const isInUrl = params.has('rangeFrom') && params.has('rangeTo');

  useEffect(() => {
    timefilter.setTime({ from: rangeFrom, to: rangeTo });
    if (!isInUrl) {
      history.replace({ pathname, search: withTimeRange(search, { rangeFrom, rangeTo }) });
    }
  }, [timefilter, history, pathname, search, rangeFrom, rangeTo, isInUrl]);

  const setTimeRange = useCallback(
    (timeRange: TimeRange) => history.push({ pathname, search: withTimeRange(search, timeRange) }),
    [history, pathname, search]
  );

  return { timeRange: { rangeFrom, rangeTo }, setTimeRange };
};
