/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, type UseQueryResult } from '@kbn/react-query';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { useKibana } from './use_kibana';

/** Fetches one significant event by its stable `event_id`, unfiltered by the landing list's severity and time range. */
export const useFetchEventById = (
  eventId: string | undefined,
  { enabled = true }: { enabled?: boolean } = {}
): UseQueryResult<SignificantEvent | null, Error> => {
  const {
    significantEvents: { significantEventsRepositoryClient },
  } = useKibana().services;

  return useQuery<SignificantEvent | null, Error>({
    queryKey: ['nightshift.eventById', eventId],
    enabled: enabled && Boolean(eventId),
    queryFn: async ({ signal }) => {
      const response = await significantEventsRepositoryClient.fetch(
        'GET /internal/significant_events/events',
        {
          params: { query: { event_id: eventId, page: 1, perPage: 1 } },
          signal: signal ?? null,
        }
      );

      return response.hits.at(0) ?? null;
    },
  });
};
