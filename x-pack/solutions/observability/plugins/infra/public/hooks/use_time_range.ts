/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { parseDateRange } from '../utils/datemath';
import { useReloadRequestTimeContext } from './use_reload_request_time';

const DEFAULT_FROM_IN_MILLISECONDS = 15 * 60000;

const getDefaultTimestamps = () => {
  const now = Date.now();

  return {
    from: new Date(now - DEFAULT_FROM_IN_MILLISECONDS).toISOString(),
    to: new Date(now).toISOString(),
  };
};

export const useTimeRange = ({ rangeFrom, rangeTo }: { rangeFrom?: string; rangeTo?: string }) => {
  // Relative datemath strings (e.g. `now-15m`, `now`) are resolved to absolute ISO
  // timestamps here. Including `reloadRequestTime` as a dependency ensures the memo
  // is re-evaluated whenever a refresh is requested, so the resolved window advances
  // with wall-clock time and keeps downstream consumers (table, KPIs, metadata) in sync.
  const { reloadRequestTime } = useReloadRequestTimeContext();

  const parsedDateRange = useMemo(() => {
    const defaults = getDefaultTimestamps();

    if (!rangeFrom || !rangeTo) {
      return defaults;
    }

    const { from = defaults.from, to = defaults.to } = parseDateRange({
      from: rangeFrom,
      to: rangeTo,
    });

    return { from, to };
    // `reloadRequestTime` is intentionally included to re-resolve relative datemath on refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeFrom, rangeTo, reloadRequestTime]);

  return parsedDateRange;
};
