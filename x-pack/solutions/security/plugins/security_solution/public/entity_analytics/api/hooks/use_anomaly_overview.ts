/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { AnomalyScoreRange } from '../../../../common/api/entity_analytics';
import { useEntityAnalyticsRoutes } from '../api';
import {
  USE_FACELIFT_MOCK_FLYOUT,
  getFaceliftAnomalyOverview,
} from '../../components/home/facelift/flyout_data';

export const ANOMALY_OVERVIEW_QUERY_KEY = ['POST', 'FETCH_ANOMALY_OVERVIEW'] as const;

interface UseAnomalyOverviewParams {
  entityId: string;
  entityType: string;
  from?: number;
  to?: number;
  threatTactics?: string[];
  scoreRanges?: AnomalyScoreRange[];
  enabled?: boolean;
}

export const useAnomalyOverview = ({
  entityId,
  entityType,
  from,
  to,
  threatTactics,
  scoreRanges,
  enabled = true,
}: UseAnomalyOverviewParams) => {
  const { fetchAnomalyOverview } = useEntityAnalyticsRoutes();

  const mockData =
    USE_FACELIFT_MOCK_FLYOUT && entityId ? getFaceliftAnomalyOverview(entityId) : null;

  const hasBody =
    from !== undefined ||
    to !== undefined ||
    (threatTactics && threatTactics.length > 0) ||
    (scoreRanges && scoreRanges.length > 0);
  const body = hasBody
    ? { from, to, threat_tactics: threatTactics, score_ranges: scoreRanges }
    : undefined;

  const query = useQuery(
    [...ANOMALY_OVERVIEW_QUERY_KEY, entityType, entityId, from, to, threatTactics, scoreRanges],
    ({ signal }) => fetchAnomalyOverview({ entityType, entityId, body, signal }),
    {
      enabled: enabled && !!entityId && !mockData,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) =>
        failureCount < 3 && (error as { response?: { status?: number } })?.response?.status !== 400,
    }
  );

  return useMemo(() => {
    if (!mockData) {
      return query;
    }
    return {
      ...query,
      data: mockData,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      status: 'success' as const,
    };
  }, [mockData, query]);
};
