/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import type { LocationAgentStats } from '../../../../../../../common/types';
import { getAgentStatsAction, selectAgentStats } from '../../../../state/agent_stats';
import { useSyntheticsRefreshContext } from '../../../../contexts';

/**
 * Enrolled agents, health and host metrics for every private location, keyed by
 * location id. Backed by a shared Redux slice so both consumers — the private
 * locations table and the monitor "Location agents" section — read from one
 * cache and trigger a single fetch, refetching only when the cache is empty or
 * on an app refresh (rather than a full cross-location fan-out per mount).
 */
export const useAgentStats = () => {
  const dispatch = useDispatch();
  const { data, loading } = useSelector(selectAgentStats);
  const { lastRefresh } = useSyntheticsRefreshContext();
  const lastRefreshRef = useRef(lastRefresh);

  useEffect(() => {
    const refreshed = lastRefreshRef.current !== lastRefresh;
    lastRefreshRef.current = lastRefresh;
    if (data === null || refreshed) {
      dispatch(getAgentStatsAction.get());
    }
  }, [dispatch, data, lastRefresh]);

  const byLocation = useMemo(() => {
    const map = new Map<string, LocationAgentStats>();
    (data ?? []).forEach((entry) => map.set(entry.locationId, entry));
    return map;
  }, [data]);

  return { byLocation, loading };
};
