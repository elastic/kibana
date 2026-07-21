/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import type { LocationShardStats } from '../../../../../../../server/routes/settings/private_locations/get_shard_stats';
import { getPrivateLocationShardStats } from '../../../../state/private_locations/api';

export const useShardStats = () => {
  const [data, setData] = useState<LocationShardStats[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPrivateLocationShardStats()
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
  }, []);

  const byLocation = useMemo(() => {
    const map = new Map<string, LocationShardStats>();
    data.forEach((entry) => map.set(entry.locationId, entry));
    return map;
  }, [data]);

  return { byLocation, loading };
};
