/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';

// Default time range (matches Kibana's default)
const DEFAULT_FROM = 'now-15m';
const DEFAULT_TO = 'now';

/** Reads the relative URL time range and memoizes its absolute values. */
export function useTimeRange() {
  const location = useLocation();

  const { rangeFrom, rangeTo } = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return {
      rangeFrom: searchParams.get('rangeFrom') ?? DEFAULT_FROM,
      rangeTo: searchParams.get('rangeTo') ?? DEFAULT_TO,
    };
  }, [location.search]);

  // Resolving "now" is memoized on the relative range: without it every render
  // produces new absolute values, which turns them into unstable effect/query
  // dependencies for consumers.
  return useMemo(() => {
    const { from: start, to: end } = getAbsoluteTimeRange(
      { from: rangeFrom, to: rangeTo },
      { forceNow: new Date() }
    );

    return {
      rangeFrom,
      rangeTo,
      start,
      end,
      startMs: new Date(start).getTime(),
      endMs: new Date(end).getTime(),
    };
  }, [rangeFrom, rangeTo]);
}
