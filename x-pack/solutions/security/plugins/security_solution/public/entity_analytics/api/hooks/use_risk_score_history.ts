/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useErrorToast } from '../../../common/hooks/use_error_toast';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useEntityAnalyticsRoutes } from '../api';
import type { FetchRiskScoreHistoryParams } from '../api';

export interface UseRiskScoreHistoryParams extends Omit<FetchRiskScoreHistoryParams, 'entityId'> {
  entityId: string | undefined;
  skip?: boolean;
}

/**
 * Reads the risk score time-series index. Serves both the timeline chart
 * (light entries) and the point-in-time contributions detail
 * (includeContributions).
 */
export const useRiskScoreHistory = ({
  entityType,
  entityId,
  from,
  to,
  scoreType,
  includeContributions,
  skip = false,
}: UseRiskScoreHistoryParams) => {
  const { fetchRiskScoreHistory } = useEntityAnalyticsRoutes();
  const isRiskScoreHistoryEnabled = useIsExperimentalFeatureEnabled('riskScoreHistoryEnabled');
  const enabled = isRiskScoreHistoryEnabled && !skip && entityId !== undefined;

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [
      'GET',
      'RISK_SCORE_HISTORY',
      entityType,
      entityId,
      from,
      to,
      scoreType,
      includeContributions,
    ],
    queryFn: async ({ signal }) => {
      if (entityId === undefined) {
        throw new Error('useRiskScoreHistory: entityId is required when the query is enabled');
      }
      return fetchRiskScoreHistory({
        signal,
        params: { entityType, entityId, from, to, scoreType, includeContributions },
      });
    },
    enabled,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  useErrorToast(
    i18n.translate('xpack.securitySolution.entityAnalytics.riskScoreHistory.errorToastTitle', {
      defaultMessage: 'Failed to load risk score history',
    }),
    enabled ? error : undefined
  );

  return { data, isLoading, isFetching, error: error ?? undefined, refetch };
};
