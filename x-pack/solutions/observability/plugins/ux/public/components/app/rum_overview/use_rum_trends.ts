/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type { RumTrendPoint } from '../../../../common/rum_app';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { fetchRumOverview } from '../../../services/rest/rum_api';

export function useRumTrends(): { points: RumTrendPoint[]; loading: boolean } {
  const { http } = useKibanaServices();
  const {
    urlParams: {
      rangeFrom = 'now-24h',
      rangeTo = 'now',
      serviceName,
      browser,
      os,
      location,
      pageUrl,
      frustration,
      user,
      includeBots,
      kuery,
      breakpoint,
      connection,
      device,
    },
  } = useLegacyUrlParams();

  const [points, setPoints] = useState<RumTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const locationFilter = typeof location === 'string' ? location : undefined;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchRumOverview({
        http,
        rangeFrom,
        rangeTo,
        serviceName: typeof serviceName === 'string' ? serviceName : undefined,
        browser,
        os,
        location: locationFilter,
        pageUrl,
        frustration,
        user,
        includeBots,
        kuery,
        breakpoint,
        connection,
        device,
      });
      setPoints(result.trends);
    } catch {
      setPoints([]);
    } finally {
      setLoading(false);
    }
  }, [
    http,
    rangeFrom,
    rangeTo,
    serviceName,
    browser,
    os,
    locationFilter,
    pageUrl,
    frustration,
    user,
    includeBots,
    kuery,
    breakpoint,
    connection,
    device,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  return { points, loading };
}
