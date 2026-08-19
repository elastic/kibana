/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, type UseQueryResult } from '@kbn/react-query';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { useKibana } from './use_kibana';

/**
 * Fetches a single significant event by its stable `event_id`, so a deep link can restore the
 * flyout for an event that is not on the landing list.
 *
 * The request deliberately carries no `severity`, `status`, `from` or `to`: a shared link has to
 * resolve independently of the filters and lookback window the landing list applies, otherwise a
 * link to a medium/low-severity or older event silently resolves to nothing.
 */
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

      // `null`, not `undefined`: react-query rejects an undefined query result, which would turn a
      // legitimately missing event into a retrying error instead of a settled "not found".
      return response.hits.at(0) ?? null;
    },
  });
};
