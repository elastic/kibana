/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { useQuery, type QueryClient, type UseQueryResult } from '@kbn/react-query';
import type { SignificantEventsRepositoryClient } from '@kbn/significant-events-plugin/public';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { useKibana } from './use_kibana';
import { NIGHTSHIFT_LANDING_SEVERITIES } from '../common/constants';
import { hasRunningInvestigations } from '../event/significant_event_status';

/**
 * The paginated envelope the events endpoint returns, flattened across the pages we
 * fetch. Declared locally because the cache also holds client-side investigation
 * completions that the server response does not carry yet.
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

const pendingInvestigationCompletions = new Map<string, string>();

const pendingInvestigationCompletionKey = (eventId: string, workflowExecutionId: string): string =>
  `${eventId}:${workflowExecutionId}`;

export const clearPendingInvestigationCompletionsForTests = (): void => {
  pendingInvestigationCompletions.clear();
};

const applyPendingInvestigationCompletions = (hits: SignificantEvent[]): SignificantEvent[] => {
  if (pendingInvestigationCompletions.size === 0) {
    return hits;
  }

  let changed = false;
  const nextHits = hits.map((hit) => {
    const investigations = hit.investigations;
    if (!investigations?.length) {
      return hit;
    }

    let investigationsChanged = false;
    const nextInvestigations = investigations.map((investigation) => {
      if (investigation.completed_at != null) {
        return investigation;
      }

      const pendingCompletedAt = pendingInvestigationCompletions.get(
        pendingInvestigationCompletionKey(hit.event_id, investigation.workflow_execution_id)
      );
      if (!pendingCompletedAt) {
        return investigation;
      }

      investigationsChanged = true;
      return { ...investigation, completed_at: pendingCompletedAt };
    });

    if (!investigationsChanged) {
      return hit;
    }

    changed = true;
    return { ...hit, investigations: nextInvestigations };
  });

  return changed ? nextHits : hits;
};

const fetchSignificantEvents = async ({
  significantEventsRepositoryClient,
  signal,
  from,
  to,
}: {
  significantEventsRepositoryClient: SignificantEventsRepositoryClient;
  signal: AbortSignal | undefined;
  from: string;
  to: string;
}): Promise<NightshiftSignificantEventsQueryData> => {
  const allHits: SignificantEvent[] = [];
  let page = 1;
  let total = 0;

  while (page <= MAX_FETCH_PAGES) {
    const response = await significantEventsRepositoryClient.fetch(
      'GET /internal/significant_events/events',
      {
        params: {
          query: {
            page,
            perPage: NIGHTSHIFT_EVENTS_PAGE_SIZE,
            from,
            to,
            severity: [...NIGHTSHIFT_LANDING_SEVERITIES],
          },
        },
        signal: signal ?? null,
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
    hits: applyPendingInvestigationCompletions(allHits),
    page: 1,
    perPage: allHits.length,
    total,
  };
};

export const useFetchSignificantEvents = (): UseQueryResult<
  NightshiftSignificantEventsQueryData,
  Error
> => {
  const {
    significantEvents: { significantEventsRepositoryClient },
  } = useKibana().services;

  return useQuery<NightshiftSignificantEventsQueryData, Error>({
    queryKey: NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const from = moment().subtract(NIGHTSHIFT_LOOKBACK_DAYS, 'days').toISOString();
      const to = moment().toISOString();

      return fetchSignificantEvents({ significantEventsRepositoryClient, signal, from, to });
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

        pendingInvestigationCompletions.set(
          pendingInvestigationCompletionKey(
            hit.event_id,
            latestInvestigation.workflow_execution_id
          ),
          completedAt
        );

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
