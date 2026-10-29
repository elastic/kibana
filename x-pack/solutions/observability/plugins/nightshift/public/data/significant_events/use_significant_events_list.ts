/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type {
  SignificantEventsSortField,
  SignificantEventsSortOrder,
} from '@kbn/significant-events-plugin/common';
import { useFetchErrorToast } from '../../hooks/use_fetch_error_toast';
import { applyPendingInvestigationCompletions } from '../../hooks/use_fetch_significant_events';
import { useKibana } from '../../hooks/use_kibana';
import { significantEventsListQueryKey } from '../query_keys';
import { hasInvestigationsToPoll } from './investigation_state';
import { toEventsFilterQuery, type SignificantEventsFilters } from './events_filter_query';

const RUNNING_INVESTIGATIONS_REFETCH_INTERVAL_MS = 5_000;

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

  return useQuery({
    queryKey: significantEventsListQueryKey(params),
    queryFn: async ({ signal }) => {
      const response = await significantEventsRepositoryClient.fetch(
        'GET /internal/significant_events/events',
        {
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
        }
      );

      // Keep completions the flyout saw before the server records them.
      return { ...response, hits: applyPendingInvestigationCompletions(response.hits) };
    },
    keepPreviousData: true,
    refetchInterval: (data) =>
      data?.hits && hasInvestigationsToPoll(data.hits)
        ? RUNNING_INVESTIGATIONS_REFETCH_INTERVAL_MS
        : false,
    onError: showFetchErrorToast,
  });
};
