/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { AnomalyScoreRange } from '../../../../common/api/entity_analytics';
import { useEntityAnalyticsRoutes } from '../api';

export const ANOMALY_OVERVIEW_QUERY_KEY = ['POST', 'FETCH_ANOMALY_OVERVIEW'] as const;

interface UseAnomalyOverviewParams {
  /** Entity Store ids to cover: the target first, then any resolution-group aliases. */
  entityIds: string[];
  entityType: string;
  from?: number;
  to?: number;
  threatTactics?: string[];
  scoreRanges?: AnomalyScoreRange[];
  enabled?: boolean;
  /**
   * Optional Kibana execution context forwarded to the anomaly-overview fetch so slow logs and
   * APM traces can attribute the query to the calling page/panel.
   */
  executionContext?: KibanaExecutionContext;
}

export const useAnomalyOverview = ({
  entityIds,
  entityType,
  from,
  to,
  threatTactics,
  scoreRanges,
  enabled = true,
  executionContext,
}: UseAnomalyOverviewParams) => {
  const { fetchAnomalyOverview } = useEntityAnalyticsRoutes();

  const hasBody =
    from !== undefined ||
    to !== undefined ||
    (threatTactics && threatTactics.length > 0) ||
    (scoreRanges && scoreRanges.length > 0);
  const body = hasBody
    ? { from, to, threat_tactics: threatTactics, score_ranges: scoreRanges }
    : undefined;

  return useQuery(
    [...ANOMALY_OVERVIEW_QUERY_KEY, entityType, entityIds, from, to, threatTactics, scoreRanges],
    ({ signal }) =>
      fetchAnomalyOverview({ entityType, entityIds, body, signal, context: executionContext }),
    {
      enabled: enabled && entityIds.length > 0,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) =>
        failureCount < 3 && (error as { response?: { status?: number } })?.response?.status !== 400,
    }
  );
};
