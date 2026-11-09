/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@kbn/react-query';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { useCallback, useMemo } from 'react';
import type { MitreFramework } from '@kbn/security-mitre-attack-common';
import { DEFAULT_MITRE_FRAMEWORK } from '@kbn/security-mitre-attack-common';
import * as i18n from '../../../rule_management_ui/pages/coverage_overview/translations';
import type {
  CoverageOverviewFilter,
  CoverageOverviewResponse,
} from '../../../../../common/api/detection_engine';
import { RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL } from '../../../../../common/api/detection_engine';
import { fetchCoverageOverview } from '../api';
import { buildCoverageOverviewDashboardModel } from '../../logic/coverage_overview/build_coverage_overview_dashboard_model';
import type { CoverageOverviewDashboard } from '../../model/coverage_overview/dashboard';
import { DEFAULT_QUERY_OPTIONS } from './constants';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useMitreConfiguration } from '../../../../common/hooks/mitre/use_mitre_configuration';

const COVERAGE_OVERVIEW_QUERY_KEY = ['POST', RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL];

export type FetchCoverageOverviewResult = Omit<
  UseQueryResult<CoverageOverviewResponse>,
  'isLoading' | 'data'
> & {
  data: CoverageOverviewDashboard | undefined;
  isLoading: boolean;
  isMitreError: boolean;
  frameworkVersion: string | undefined;
};

/**
 * A wrapper around useQuery provides default values to the underlying query,
 * like query key, abortion signal, and error handler. The coverage response is cached per
 * filter; the dashboard model is derived in memory for the given framework's MITRE data.
 *
 * @param filter - coverage overview filter, see CoverageOverviewFilter type
 * @param framework - MITRE framework whose tactics/techniques form the dashboard model
 * @param options - react-query options for the coverage request
 * @returns query result with the framework dashboard model, isMitreError flag, frameworkVersion and a combined isLoading
 */
export const useFetchCoverageOverviewQuery = (
  filter: CoverageOverviewFilter = {},
  framework: MitreFramework = DEFAULT_MITRE_FRAMEWORK,
  options?: UseQueryOptions<CoverageOverviewResponse>
): FetchCoverageOverviewResult => {
  const { addError } = useAppToasts();
  const mitreConfig = useMitreConfiguration({ framework });
  const { tactics, techniques, subtechniques, frameworkVersion } = mitreConfig;

  const queryResult = useQuery<CoverageOverviewResponse>(
    [...COVERAGE_OVERVIEW_QUERY_KEY, filter],
    ({ signal }) => fetchCoverageOverview({ signal, filter }),
    {
      ...DEFAULT_QUERY_OPTIONS,
      ...options,
      onError: (error) => {
        addError(error, {
          title: i18n.COVERAGE_OVERVIEW_FETCH_ERROR_TITLE,
        });
      },
    }
  );

  // Building the dashboard model requires MITRE data for the selected framework.
  const mitreReady = !mitreConfig.isLoading && !mitreConfig.isError;
  const { data: response } = queryResult;

  const data = useMemo(
    () =>
      response && mitreReady
        ? buildCoverageOverviewDashboardModel(response, { tactics, techniques, subtechniques })
        : undefined,
    [response, mitreReady, tactics, techniques, subtechniques]
  );

  return {
    ...queryResult,
    data,
    // react-query v4: a disabled query still reports isLoading:true when it has no cached
    // data, so `queryResult.isLoading` could keep the spinner up forever. `isInitialLoading`
    // (= isLoading && isFetching) is false for a disabled query, so the spinner resolves
    // correctly even when the coverage fetch is disabled by the caller.
    isLoading: mitreConfig.isLoading || queryResult.isInitialLoading,
    isMitreError: mitreConfig.isError,
    frameworkVersion,
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
