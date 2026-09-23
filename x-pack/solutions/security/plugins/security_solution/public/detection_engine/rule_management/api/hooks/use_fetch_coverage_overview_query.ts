/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@kbn/react-query';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { useCallback } from 'react';
import * as i18n from '../../../rule_management_ui/pages/coverage_overview/translations';
import type { CoverageOverviewFilter } from '../../../../../common/api/detection_engine';
import { RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL } from '../../../../../common/api/detection_engine';
import { fetchCoverageOverview } from '../api';
import { buildCoverageOverviewDashboardModel } from '../../logic/coverage_overview/build_coverage_overview_dashboard_model';
import type { CoverageOverviewDashboard } from '../../model/coverage_overview/dashboard';
import { DEFAULT_QUERY_OPTIONS } from './constants';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useMitreConfiguration } from '../../../../common/hooks/mitre/use_mitre_configuration';

const COVERAGE_OVERVIEW_QUERY_KEY = ['POST', RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL];

export type FetchCoverageOverviewResult = Omit<
  UseQueryResult<CoverageOverviewDashboard>,
  'isLoading'
> & {
  isLoading: boolean;
  isMitreError: boolean;
};

/**
 * A wrapper around useQuery provides default values to the underlying query,
 * like query key, abortion signal, and error handler.
 *
 * @param filter - coverage overview filter, see CoverageOverviewFilter type
 * @param options - react-query options; `enabled` is ANDed with the internal mitre-ready gate
 * @returns query result with isMitreError flag and a combined isLoading
 */
export const useFetchCoverageOverviewQuery = (
  filter: CoverageOverviewFilter = {},
  options?: UseQueryOptions<CoverageOverviewDashboard>
): FetchCoverageOverviewResult => {
  const { addError } = useAppToasts();
  const mitreConfig = useMitreConfiguration();

  // mitreReady gates the fetch: building the dashboard model requires MITRE data.
  // Including it in the query key prevents a blank grid when MITRE data loads after mount.
  const mitreReady = !mitreConfig.isLoading && !mitreConfig.isError;

  const queryResult = useQuery<CoverageOverviewDashboard>(
    [...COVERAGE_OVERVIEW_QUERY_KEY, filter, mitreReady],
    async ({ signal }) => {
      const response = await fetchCoverageOverview({ signal, filter });

      return buildCoverageOverviewDashboardModel(response, {
        tactics: mitreConfig.tactics,
        techniques: mitreConfig.techniques,
        subtechniques: mitreConfig.subtechniques,
      });
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      ...options,
      enabled: mitreReady && (options?.enabled ?? true),
      onError: (error) => {
        addError(error, {
          title: i18n.COVERAGE_OVERVIEW_FETCH_ERROR_TITLE,
        });
      },
    }
  );

  return {
    ...queryResult,
    // react-query v4: a disabled query (mitreReady=false) still reports isLoading:true when
    // it has no cached data, so `queryResult.isLoading` would keep the spinner up forever when
    // MITRE fails. `isInitialLoading` (= isLoading && isFetching) is false for a disabled query,
    // so using it here ensures the spinner resolves correctly even when the coverage fetch is
    // disabled because MITRE errored out.
    isLoading: mitreConfig.isLoading || queryResult.isInitialLoading,
    isMitreError: mitreConfig.isError,
  };
};

/**
 * We should use this hook to invalidate the coverage overview cache. For example, rule
 * mutations that affect rule set size, like creation or deletion, should lead
 * to cache invalidation.
 *
 * @returns A coverage overview cache invalidation callback
 */
export const useInvalidateFetchCoverageOverviewQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(COVERAGE_OVERVIEW_QUERY_KEY, {
      refetchType: 'active',
    });
  }, [queryClient]);
};
