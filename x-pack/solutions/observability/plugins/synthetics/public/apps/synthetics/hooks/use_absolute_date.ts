/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { useMemo } from 'react';
import moment, { DurationInputArg1, DurationInputArg2 } from 'moment';
import { useSyntheticsRefreshContext } from '../contexts';
import { useGetUrlParams } from './use_url_params';

export function useAbsoluteDate({ from, to }: { from: string; to: string }) {
  const { lastRefresh } = useSyntheticsRefreshContext();
  return useMemo(
    () => ({
      from: datemath.parse(from)?.toISOString() ?? from,
      to: datemath.parse(to, { roundUp: true })?.toISOString() ?? to,
    }),
    // we want to recompute these any time the app refreshes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [from, to, lastRefresh]
  );
}

export function useRefreshedRange(inp: DurationInputArg1, unit: DurationInputArg2) {
  const { lastRefresh } = useSyntheticsRefreshContext();

  return useMemo(
    () => ({
      from: moment(lastRefresh).subtract(inp, unit).toISOString(),
      to: new Date(lastRefresh).toISOString(),
    }),
    [lastRefresh, inp, unit]
  );
}

const isDefaultRange = (from: string, to: string) => {
  return from === 'now-24h' && to === 'now';
};

export function useRefreshedRangeFromUrl() {
  const { dateRangeStart, dateRangeEnd } = useGetUrlParams();
  const isDefault = isDefaultRange(dateRangeStart, dateRangeEnd);

  const absRange = useAbsoluteDate({ from: dateRangeStart, to: dateRangeEnd });

  const defaultRange = useRefreshedRange(24, 'hours');

  return isDefault ? defaultRange : absRange;
}
