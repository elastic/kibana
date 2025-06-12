/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Filter, buildQueryFromFilters } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FindSLOGroupsResponse } from '@kbn/slo-schema';
import {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
  useQuery,
} from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  DEFAULT_SLO_GROUPS_PAGE_SIZE,
  SUMMARY_DESTINATION_INDEX_PATTERN,
} from '../../common/constants';
import type { GroupByField } from '../pages/slos/types';
import { SearchState } from '../pages/slos/hooks/use_url_search_state';
import { useKibana } from './use_kibana';
import { sloKeys } from './query_key_factory';
import { useCreateDataView } from './use_create_data_view';
import { usePluginContext } from './use_plugin_context';

interface SLOGroupsParams {
  page?: number;
  perPage?: number;
  groupBy?: GroupByField;
  groupsFilter?: string[];
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
  data: FindSLOGroupsResponse | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<FindSLOGroupsResponse | undefined, unknown>>;
}

export function useFetchSloGroups({
  page = 1,
  perPage = DEFAULT_SLO_GROUPS_PAGE_SIZE,
  groupBy = 'ungrouped',
  groupsFilter = [],
  kqlQuery = '',
  tagsFilter,
  statusFilter,
  filters: filterDSL = [],
  lastRefresh,
}: SLOGroupsParams = {}): UseFetchSloGroupsResponse {
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
  const { data, isLoading, isSuccess, isError, isRefetching, refetch } = useQuery({
    queryKey: sloKeys.group({
      page,
      perPage,
      groupBy,
      groupsFilter,
      kqlQuery,
      filters,
      lastRefresh,
    }),
    queryFn: async ({ signal }) => {
      const response = await sloClient.fetch('GET /internal/observability/slos/_groups', {
        params: {
          query: {
            ...(page && { page: String(page) }),
            ...(perPage && { perPage: String(perPage) }),
            ...(groupBy && { groupBy }),
            ...(groupsFilter && { groupsFilter }),
            ...(kqlQuery && { kqlQuery }),
            ...(filters && { filters }),
          },
        },
        signal,
      });
      return response;
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
        title: i18n.translate('xpack.slo.groups.list.errorNotification', {
          defaultMessage: 'Something went wrong while fetching SLO Groups',
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
    refetch,
  };
}
