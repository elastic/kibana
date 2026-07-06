/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import type { MonitorSummaryStats } from '../../../../server/routes/monitor_cruds/get_monitor_summary_stats';
import { apiService } from '../../../utils/api_service';
import { useSyntheticsRefreshContext } from '../contexts';

export const useMonitorSummaryStats = ({
  monitorId,
  locationLabel,
  from = 'now-30d',
  to = 'now',
  remoteName,
}: {
  monitorId: string;
  locationLabel: string;
  from?: string;
  to?: string;
  remoteName?: string;
}) => {
  const [data, setData] = useState<MonitorSummaryStats | null>(null);
  const [loading, setLoading] = useState(true);

  const { lastRefresh } = useSyntheticsRefreshContext();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    apiService
      .get<MonitorSummaryStats>(SYNTHETICS_API_URLS.MONITOR_SUMMARY_STATS, {
        monitorId,
        locationLabel,
        from,
        to,
        ...(remoteName ? { remoteName } : {}),
      })
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [monitorId, locationLabel, from, to, remoteName, lastRefresh]);

  return { data, loading };
};
