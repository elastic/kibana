/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { useQuery, type QueryClient, type UseQueryResult } from '@kbn/react-query';
import type { HttpSetup } from '@kbn/core/public';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { useKibana } from '../../../utils/kibana_react';
import { NIGHTSHIFT_LANDING_SEVERITY } from '../common/nightshift_constants';
import { hasRunningInvestigations } from '../event/significant_event_status';

/**
 * The significant-events events endpoint returns a paginated envelope. We mirror the
 * shape locally instead of importing it from another plugin so the Observability
 * bundle does not couple to Streams' public contract for a value it only reads.
 */
export interface NightshiftSignificantEventsQueryData {
  hits: SignificantEvent[];
  page: number;
  perPage: number;
  total: number;
}

export const NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY = ['nightshift.significantEvents'] as const;

/** Poll while any visible event still has an open investigation workflow. */
const RUNNING_INVESTIGATIONS_REFETCH_INTERVAL_MS = 5_000;

/** Server allows up to 1000 hits per page (`events` internal route). */
export const NIGHTSHIFT_EVENTS_PAGE_SIZE = 1000;
const NIGHTSHIFT_LOOKBACK_DAYS = 30;
const MAX_FETCH_PAGES = 10;

const fetchSignificantEvents = async ({
  http,
  signal,
  from,
  to,
}: {
  http: HttpSetup;
  signal: AbortSignal | undefined;
  from: string;
  to: string;
}): Promise<NightshiftSignificantEventsQueryData> => {
  const allHits: SignificantEvent[] = [];
  let page = 1;
  let total = 0;

  while (page <= MAX_FETCH_PAGES) {
    const response = await http.get<NightshiftSignificantEventsQueryData>(
      '/internal/significant_events/events',
      {
        query: {
          page,
          perPage: NIGHTSHIFT_EVENTS_PAGE_SIZE,
          from,
          to,
          severity: NIGHTSHIFT_LANDING_SEVERITY,
        },
        signal,
      }
    );

    allHits.push(...response.hits);
    total = response.total;

    if (allHits.length >= total || response.hits.length === 0) {
      break;
    }

    page += 1;
  }

  return {
    hits: allHits,
    page: 1,
    perPage: allHits.length,
    total,
  };
};

export const useFetchSignificantEvents = (): UseQueryResult<
  NightshiftSignificantEventsQueryData,
  Error
> => {
  const { http } = useKibana().services;

  return useQuery<NightshiftSignificantEventsQueryData, Error>({
    queryKey: NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const from = moment().subtract(NIGHTSHIFT_LOOKBACK_DAYS, 'days').toISOString();
      const to = moment().toISOString();

      return fetchSignificantEvents({ http, signal, from, to });
    },
    refetchInterval: (data) =>
      data?.hits && hasRunningInvestigations(data.hits)
        ? RUNNING_INVESTIGATIONS_REFETCH_INTERVAL_MS
        : false,
  });
};

export const markEventInvestigationCompleteInCache = (
  queryClient: QueryClient,
  eventUuid: string,
  completedAt: string = new Date().toISOString()
): void => {
  queryClient.setQueryData<NightshiftSignificantEventsQueryData>(
    NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
    (current) => {
      if (!current) {
        return current;
      }

      let changed = false;
      const hits = current.hits.map((hit) => {
        if (hit.event_uuid !== eventUuid) {
          return hit;
        }

        const investigations = hit.investigations;
        if (!investigations?.length) {
          return hit;
        }

        const latestIndex = investigations.length - 1;
        const latestInvestigation = investigations[latestIndex];
        if (latestInvestigation.completed_at != null) {
          return hit;
        }

        changed = true;
        const updatedInvestigations = [...investigations];
        updatedInvestigations[latestIndex] = {
          ...latestInvestigation,
          completed_at: completedAt,
        };
        return { ...hit, investigations: updatedInvestigations };
      });

      return changed ? { ...current, hits } : current;
    }
  );
};
