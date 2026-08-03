/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import type { LocationAgentStats } from '../../../../../../../server/routes/settings/private_locations/get_agent_stats';
import { getPrivateLocationAgentStats } from '../../../../state/private_locations/api';
import { useSyntheticsRefreshContext } from '../../../../contexts';

/**
 * Enrolled agents, health and host metrics for every private location, keyed by
 * location id. Refetches on app refresh so the private locations table and the
 * monitor "Location agents" section stay in sync with Fleet.
 */
export const useAgentStats = () => {
  const [data, setData] = useState<LocationAgentStats[]>([]);
  const [loading, setLoading] = useState(false);
  const { lastRefresh } = useSyntheticsRefreshContext();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPrivateLocationAgentStats()
      .then((stats) => {
        if (!cancelled) {
          setData(stats);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lastRefresh]);

  const byLocation = useMemo(() => {
    const map = new Map<string, LocationAgentStats>();
    data.forEach((entry) => map.set(entry.locationId, entry));
    return map;
  }, [data]);

  return { byLocation, loading };
};
