/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useQueryClient } from '@kbn/react-query';
import type {
  SignificantEventsSortField,
  SignificantEventsSortOrder,
} from '@kbn/significant-events-plugin/common';
import { useFetchErrorToast } from '../../hooks/use_fetch_error_toast';
import { useKibana } from '../../hooks/use_kibana';
import { significantEventsListQueryKey } from '../query_keys';
import { getInvestigationsRefetchInterval } from './investigation_state';
import { toEventsFilterQuery, type SignificantEventsFilters } from './events_filter_query';

export interface SignificantEventsListParams extends SignificantEventsFilters {
  page: number;
  perPage: number;
  sortField: SignificantEventsSortField;
  sortOrder: SignificantEventsSortOrder;
}

export const useSignificantEventsList = (params: SignificantEventsListParams) => {
  const { significantEventsRepositoryClient } = useKibana().services.significantEvents;
  const showFetchErrorToast = useFetchErrorToast();
  const { page, perPage, sortField, sortOrder, ...filters } = params;

  const queryClient = useQueryClient();

  return useQuery({
    queryKey: significantEventsListQueryKey(params),
    queryFn: async ({ signal }) => {
      return significantEventsRepositoryClient.fetch('GET /internal/significant_events/events', {
        params: {
          query: {
            ...toEventsFilterQuery(filters),
            page,
            perPage,
            sort_field: sortField,
            sort_order: sortOrder,
          },
        },
        signal: signal ?? null,
      });
    },
    keepPreviousData: true,
    refetchInterval: (data) =>
      data?.hits ? getInvestigationsRefetchInterval(data.hits, queryClient) : false,
    onError: showFetchErrorToast,
  });
};
