/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildQueryFromFilters, Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FindSLOResponse } from '@kbn/slo-schema';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { DEFAULT_SLO_PAGE_SIZE, SUMMARY_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import { SearchState } from '../pages/slos/hooks/use_url_search_state';
import { useKibana } from './use_kibana';
import { sloKeys } from './query_key_factory';
import { useCreateDataView } from './use_create_data_view';
import { usePluginContext } from './use_plugin_context';
import type { SortDirection, SortField } from '../pages/slos/types';

export interface SLOListParams {
  kqlQuery?: string;
  page?: number;
  sortBy?: SortField;
  sortDirection?: SortDirection;
  perPage?: number;
  filters?: Filter[];
  lastRefresh?: number;
  tagsFilter?: SearchState['tagsFilter'];
  statusFilter?: SearchState['statusFilter'];
  disabled?: boolean;
}

export interface UseFetchSloListResponse {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: FindSLOResponse | undefined;
}

export function useFetchSloList({
  kqlQuery = '',
  page = 1,
  sortBy = 'status',
  sortDirection = 'desc',
  perPage = DEFAULT_SLO_PAGE_SIZE,
  filters: filterDSL = [],
  lastRefresh,
  tagsFilter,
  statusFilter,
  disabled = false,
}: SLOListParams = {}): UseFetchSloListResponse {
  const {
    notifications: { toasts },
  } = useKibana().services;
  const { sloClient } = usePluginContext();

  const queryClient = useQueryClient();

  const { dataView } = useCreateDataView({
    indexPatternString: SUMMARY_DESTINATION_INDEX_PATTERN,
  });

  const filters = useMemo(() => {
    try {
      return JSON.stringify(
        buildQueryFromFilters(
          [
            ...filterDSL,
            ...(statusFilter ? [statusFilter] : []),
            ...(tagsFilter ? [tagsFilter] : []),
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
  }, [filterDSL, dataView, tagsFilter, statusFilter]);

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: sloKeys.list({
      kqlQuery,
      page,
      perPage,
      sortBy,
      sortDirection,
      filters,
      lastRefresh,
    }),
    queryFn: async ({ signal }) => {
      return await sloClient.fetch('GET /api/observability/slos 2023-10-31', {
        params: {
          query: {
            ...(kqlQuery && { kqlQuery }),
            ...(sortBy && { sortBy }),
            ...(sortDirection && { sortDirection }),
            ...(page !== undefined && { page: String(page) }),
            ...(perPage !== undefined && { perPage: String(perPage) }),
            ...(filters && { filters }),
            hideStale: true,
          },
        },
        signal,
      });
    },
    enabled: !disabled,
    cacheTime: 0,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (String(error) === 'Error: Forbidden') {
        return false;
      }

      return failureCount < 4;
    },
    onSuccess: ({ results }: FindSLOResponse) => {
      queryClient.invalidateQueries({ queryKey: sloKeys.historicalSummaries(), exact: false });
      queryClient.invalidateQueries({ queryKey: sloKeys.activeAlerts(), exact: false });
      queryClient.invalidateQueries({ queryKey: sloKeys.rules(), exact: false });
    },
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.slo.list.errorNotification', {
          defaultMessage: 'Something went wrong while fetching SLOs',
        }),
      });
    },
  });

  return {
    data,
    isInitialLoading,
    isLoading,
    isRefetching,
    isSuccess,
    isError,
  };
}
