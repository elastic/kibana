/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import type { LocationAgentStats } from '../../../../../../../common/types';
import { getPrivateLocationAgentStats } from '../../../../state/private_locations/api';
import { useSyntheticsRefreshContext } from '../../../../contexts';

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
