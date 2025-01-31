/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { buildQueryFromFilters, Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { GetOverviewResponse } from '@kbn/slo-schema/src/rest_specs/routes/get_overview';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { SUMMARY_DESTINATION_INDEX_PATTERN } from '../../../../common/constants';
import { sloKeys } from '../../../hooks/query_key_factory';
import { useCreateDataView } from '../../../hooks/use_create_data_view';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { useKibana } from '../../../hooks/use_kibana';
import { SearchState } from './use_url_search_state';

interface SLOsOverviewParams {
  kqlQuery?: string;
  tagsFilter?: SearchState['tagsFilter'];
  statusFilter?: SearchState['statusFilter'];
  filters?: Filter[];
  lastRefresh?: number;
}

interface UseFetchSloGroupsResponse {
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: GetOverviewResponse | undefined;
}

export function useFetchSLOsOverview({
  kqlQuery = '',
  tagsFilter,
  statusFilter,
  filters: filterDSL = [],
  lastRefresh,
}: SLOsOverviewParams = {}): UseFetchSloGroupsResponse {
  const { sloClient } = usePluginContext();
  const {
    notifications: { toasts },
  } = useKibana().services;

  const { dataView } = useCreateDataView({
    indexPatternString: SUMMARY_DESTINATION_INDEX_PATTERN,
  });

  const filters = useMemo(() => {
    try {
      return JSON.stringify(
        buildQueryFromFilters(
          [
            ...filterDSL,
            ...(tagsFilter ? [tagsFilter] : []),
            ...(statusFilter ? [statusFilter] : []),
          ],
          dataView,
          {
            ignoreFilterIfFieldNotInIndex: true,
          }
        )
      );
    } catch (e) {
      return '';
    }
  }, [filterDSL, tagsFilter, statusFilter, dataView]);
  const { data, isLoading, isSuccess, isError, isRefetching } = useQuery({
    queryKey: sloKeys.overview({
      kqlQuery,
      filters,
      lastRefresh,
    }),
    queryFn: async ({ signal }) => {
      return await sloClient.fetch('GET /internal/observability/slos/overview', {
        params: {
          query: {
            ...(kqlQuery && { kqlQuery }),
            ...(filters && { filters }),
          },
        },
        signal,
      });
    },
    cacheTime: 0,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (String(error) === 'Error: Forbidden') {
        return false;
      }
      return failureCount < 4;
    },
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.slo.overview.list.errorNotification', {
          defaultMessage: 'Something went wrong while fetching SLOs overview',
        }),
      });
    },
  });

  return {
    data,
    isLoading,
    isSuccess,
    isError,
    isRefetching,
  };
}
