/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import qs from 'query-string';
import type { ReactElement } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

export const UX_DEFAULT_RANGE_FROM = 'now-7d';
export const UX_DEFAULT_RANGE_TO = 'now';

export function useDateRangeRedirect() {
  const history = useHistory();
  const location = useLocation();
  const query = qs.parse(location.search);

  const isDateRangeSet = 'rangeFrom' in query && 'rangeTo' in query;

  const redirect = () => {
    const nextQuery = {
      rangeFrom: UX_DEFAULT_RANGE_FROM,
      rangeTo: UX_DEFAULT_RANGE_TO,
      ...query,
    };

    history.replace({
      ...location,
      search: qs.stringify(nextQuery),
    });
  };

  return {
    isDateRangeSet,
    redirect,
  };
}

/** Write last-7d onto the URL before the shared date picker inherits Kibana's 15m default. */
export function UxDefaultDateRange({ children }: { children: ReactElement }) {
  const { isDateRangeSet, redirect } = useDateRangeRedirect();
  if (!isDateRangeSet) {
    redirect();
    return null;
  }
  return children;
}
