/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { useQuery, type UseQueryResult } from '@kbn/react-query';
import type { SignificantEventsRepositoryClient } from '@kbn/significant-events-plugin/public';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { useKibana } from './use_kibana';
import { NIGHTSHIFT_LANDING_SEVERITIES } from '../common/constants';
import { hasInvestigationsToPoll } from '../data/significant_events/investigation_state';

/** The paginated envelope the events endpoint returns, flattened across the pages we fetch. */
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
  const {
    application,
    significantEvents: { significantEventsRepositoryClient },
  } = useKibana().services;
  const { canShow } = getNightshiftCapabilities(application.capabilities.nightshift);

  return useQuery<NightshiftSignificantEventsQueryData, Error>({
    queryKey: NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
    enabled: canShow,
    queryFn: async ({ signal }) => {
      const from = moment().subtract(NIGHTSHIFT_LOOKBACK_DAYS, 'days').toISOString();
      const to = moment().toISOString();

      return fetchSignificantEvents({ significantEventsRepositoryClient, signal, from, to });
    },
    refetchInterval: (data) =>
      data?.hits && hasInvestigationsToPoll(data.hits)
        ? RUNNING_INVESTIGATIONS_REFETCH_INTERVAL_MS
        : false,
  });
};
