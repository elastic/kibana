/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect, useEffect, useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useKibana } from '../hooks/use_kibana';

/**
 * Hook to check if time range params are set and provide a redirect function.
 */
function useDateRangeRedirect() {
  const history = useHistory();
  const location = useLocation();
  const {
    dependencies: {
      start: {
        data: { query: queryService },
      },
    },
  } = useKibana();

  const { isDateRangeSet, rangeFrom, rangeTo } = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return {
      isDateRangeSet: searchParams.has('rangeFrom') && searchParams.has('rangeTo'),
      rangeFrom: searchParams.get('rangeFrom'),
      rangeTo: searchParams.get('rangeTo'),
    };
  }, [location.search]);

  const redirect = useCallback(() => {
    const { timefilter } = queryService.timefilter;
    const timePickerSharedState = timefilter.getTime();
    const isTimeTouched = timefilter.isTimeTouched();

    // If the timefilter has been explicitly set (by a user action or another page),
    // preserve that value. Otherwise fall back to the significant-events default of
    // 24 hours instead of Kibana's 15m.
    const defaultFrom = 'now-24h';
    const defaultTo = 'now';

    const nextParams = new URLSearchParams(location.search);
    nextParams.set('rangeFrom', isTimeTouched ? timePickerSharedState.from : defaultFrom);
    nextParams.set('rangeTo', isTimeTouched ? timePickerSharedState.to : defaultTo);

    history.replace({
      ...location,
      search: nextParams.toString(),
    });
  }, [history, location, queryService]);

  return { isDateRangeSet, rangeFrom, rangeTo, redirect, queryService };
}

/**
 * Component that ensures time range params (rangeFrom/rangeTo) are present in the URL.
 * If they are missing, it blocks rendering and redirects to add default values.
 *
 * When adding defaults, it checks whether the global timefilter has been explicitly
 * set (isTimeTouched). If so, it preserves that value (e.g. a range the user picked
 * on another page). If not, it falls back to a default of 24 hours (instead of
 * Kibana's 15 minutes).
 *
 * Also syncs URL time params to the global timefilter on mount and URL changes.
 * This ensures components using useTimefilter() get the correct time from URL.
 */
export function DateRangeRedirect({ children }: { children: React.ReactNode }) {
  const { isDateRangeSet, rangeFrom, rangeTo, redirect, queryService } = useDateRangeRedirect();

  // Use useLayoutEffect to redirect before paint, avoiding the
  // "Cannot update a component while rendering" warning
  useLayoutEffect(() => {
    if (!isDateRangeSet) {
      redirect();
    }
  }, [isDateRangeSet, redirect]);

  useEffect(() => {
    if (rangeFrom && rangeTo) {
      const currentTime = queryService.timefilter.timefilter.getTime();
      if (currentTime.from !== rangeFrom || currentTime.to !== rangeTo) {
        queryService.timefilter.timefilter.setTime({
          from: rangeFrom,
          to: rangeTo,
        });
      }
    }
  }, [rangeFrom, rangeTo, queryService]);

  // Block rendering until time params are set
  if (!isDateRangeSet) {
    return null;
  }

  return <>{children}</>;
}
