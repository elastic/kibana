/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useCallback } from 'react';
import type { TimeRange } from '@kbn/es-query';
import type { ClusterListingResponse } from '../../common/cluster_listing';
import { callKubernetesPocApi } from '../services/rest/create_call_api';

interface UseFetchClusterListingParams {
  timeRange: TimeRange;
}

interface UseFetchClusterListingResult {
  data: ClusterListingResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

const DEFAULT_TIME_RANGE: TimeRange = {
  from: 'now-15m',
  to: 'now',
};

export function useFetchClusterListing(
  params: UseFetchClusterListingParams = { timeRange: DEFAULT_TIME_RANGE }
): UseFetchClusterListingResult {
  const { timeRange } = params;
  const [data, setData] = useState<ClusterListingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await callKubernetesPocApi('GET /internal/kubernetes_poc/cluster_listing', {
        signal: null,
        params: {
          query: {
            from: timeRange.from,
            to: timeRange.to,
          },
        },
      });
      setData(response as ClusterListingResponse);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch cluster listing'));
    } finally {
      setLoading(false);
    }
  }, [timeRange.from, timeRange.to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
