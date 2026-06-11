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

export interface UseRiskScoreHistoryParams extends FetchRiskScoreHistoryParams {
  skip?: boolean;
}

/**
 * Fetches historical risk score entries for an entity from the risk score
 * time-series index. Serves both the timeline chart (light entries) and the
 * point-in-time contributions detail (includeContributions + pageSize 1).
 */
export const useRiskScoreHistory = ({
  entityType,
  entityId,
  from,
  to,
  scoreType,
  pageSize,
  includeContributions,
  skip = false,
}: UseRiskScoreHistoryParams) => {
  const { fetchRiskScoreHistory } = useEntityAnalyticsRoutes();
  const isRiskScoreHistoryEnabled = useIsExperimentalFeatureEnabled('riskScoreHistoryEnabled');
  const enabled = isRiskScoreHistoryEnabled && !skip;

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [
      'GET',
      'RISK_SCORE_HISTORY',
      entityType,
      entityId,
      from,
      to,
      scoreType,
      pageSize,
      includeContributions,
    ],
    queryFn: ({ signal }) =>
      fetchRiskScoreHistory({
        signal,
        params: { entityType, entityId, from, to, scoreType, pageSize, includeContributions },
      }),
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

  return { data, isLoading, isFetching, error, refetch };
};
