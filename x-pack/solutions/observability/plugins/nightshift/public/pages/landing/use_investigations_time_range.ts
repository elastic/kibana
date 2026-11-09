/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import { useCallback, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  RANGE_FROM_QUERY_PARAM,
  RANGE_TO_QUERY_PARAM,
} from '../detection/use_detection_time_range';

/** The homepage lists investigations modified in the last 3 days unless told otherwise. */
export const DEFAULT_INVESTIGATIONS_TIME_RANGE = { from: 'now-3d', to: 'now' } as const;

export interface InvestigationsTimeRange {
  from: string;
  to: string;
}

/** What the list API filters on: when an investigation was last modified. */
export interface InvestigationsUpdatedWindow {
  updatedAfter?: string;
  updatedBefore?: string;
}

const MINUTE_MS = 60_000;

const isValidDate = (value: string | null, roundUp: boolean): value is string =>
  value != null && dateMath.parse(value, { roundUp })?.isValid() === true;

export const getInvestigationsTimeRange = (search: string): InvestigationsTimeRange => {
  const params = new URLSearchParams(search);
  const from = params.get(RANGE_FROM_QUERY_PARAM);
  const to = params.get(RANGE_TO_QUERY_PARAM);

  // A hand-edited or stale URL falls back to the default rather than failing every request.
  return isValidDate(from, false) && isValidDate(to, true)
    ? { from, to }
    : DEFAULT_INVESTIGATIONS_TIME_RANGE;
};

/**
 * Resolves a range to the API's filter. Times are rounded down to the minute so a relative range
 * keeps one query key between renders. An end of `now` sends no upper bound: investigations
 * modified after the page loaded still belong in "up to now".
 */
export const toUpdatedWindow = (
  { from, to }: InvestigationsTimeRange,
  now = new Date()
): InvestigationsUpdatedWindow => {
  const toIso = (value: string, roundUp: boolean): string | undefined => {
    const date = dateMath.parse(value, { roundUp, forceNow: now });
    return date?.isValid()
      ? new Date(Math.floor(date.valueOf() / MINUTE_MS) * MINUTE_MS).toISOString()
      : undefined;
  };

  return {
    updatedAfter: toIso(from, false),
    updatedBefore: to === 'now' ? undefined : toIso(to, true),
  };
};

export const useInvestigationsTimeRange = (): {
  timeRange: InvestigationsTimeRange;
  updatedWindow: InvestigationsUpdatedWindow;
  setTimeRange: (timeRange: InvestigationsTimeRange) => void;
  /** Re-resolves a relative range against the current time. */
  refreshWindow: () => void;
} => {
  const history = useHistory();
  const { search } = useLocation();
  const timeRange = useMemo(() => getInvestigationsTimeRange(search), [search]);
  const { from, to } = timeRange;
  const [refreshCount, setRefreshCount] = useState(0);
  // Re-resolved only when the range changes or the user refreshes, so a relative range does not
  // churn query keys.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updatedWindow = useMemo(() => toUpdatedWindow({ from, to }), [from, to, refreshCount]);
  const refreshWindow = useCallback(() => setRefreshCount((count) => count + 1), []);

  const setTimeRange = useCallback(
    (next: InvestigationsTimeRange) => {
      const params = new URLSearchParams(history.location.search);
      params.set(RANGE_FROM_QUERY_PARAM, next.from);
      params.set(RANGE_TO_QUERY_PARAM, next.to);
      history.replace({ search: params.toString() });
    },
    [history]
  );

  return { timeRange, updatedWindow, setTimeRange, refreshWindow };
};
