/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import { useQuery } from '@kbn/react-query';
import type {
  Severity,
  SignificantEvent,
  SignificantEventStatus,
} from '@kbn/significant-events-schema';
import { useFetchErrorToast } from '../../hooks/use_fetch_error_toast';
import { useKibana } from '../../hooks/use_kibana';
import { significantEventsListQueryKey } from '../query_keys';

const RUNNING_INVESTIGATIONS_REFETCH_INTERVAL_MS = 5_000;
const hasRunningInvestigations = (events: SignificantEvent[]): boolean =>
  events.some(({ investigations }) => {
    const latestInvestigation = investigations?.at(-1);
    return latestInvestigation != null && latestInvestigation.completed_at == null;
  });

export interface SignificantEventsListParams {
  from: string;
  to: string;
  page: number;
  perPage: number;
  search: string;
  status: SignificantEventStatus[];
  severity: Severity[];
}

export const useSignificantEventsList = ({
  from,
  to,
  page,
  perPage,
  search,
  status,
  severity,
}: SignificantEventsListParams) => {
  const { significantEventsRepositoryClient } = useKibana().services.significantEvents;
  const showFetchErrorToast = useFetchErrorToast();

  return useQuery({
    queryKey: significantEventsListQueryKey({
      from,
      to,
      page,
      perPage,
      search,
      status,
      severity,
    }),
    queryFn: ({ signal }) => {
      const absoluteRange = getAbsoluteTimeRange({ from, to }, { forceNow: new Date() });

      return significantEventsRepositoryClient.fetch('GET /internal/significant_events/events', {
        params: {
          query: {
            ...absoluteRange,
            page,
            perPage,
            search: search || undefined,
            status: status.length > 0 ? status : undefined,
            severity: severity.length > 0 ? severity : undefined,
          },
        },
        signal: signal ?? null,
      });
    },
    keepPreviousData: true,
    refetchInterval: (data) =>
      data?.hits && hasRunningInvestigations(data.hits)
        ? RUNNING_INVESTIGATIONS_REFETCH_INTERVAL_MS
        : false,
    onError: showFetchErrorToast,
  });
};
