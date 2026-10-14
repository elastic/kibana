/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, type UseQueryResult } from '@kbn/react-query';
import type { EventLifecycleResponse } from '@kbn/significant-events-schema';
import { useKibana } from './use_kibana';

// Keeps the flyout fresh while it stays open during a live incident.
const REFETCH_INTERVAL_MS = 60_000;

/**
 * Fetches the lifecycle chain of a significant event: its change-point
 * detections and stored event versions.
 *
 * `eventId` is the stable incident key (`event_id`) — the lifecycle route
 * looks up the full version lineage by event_id.
 */
export const useFetchEventLifecycle = (
  eventId: string,
  { enabled = true }: { enabled?: boolean } = {}
): UseQueryResult<EventLifecycleResponse, Error> => {
  const {
    significantEvents: { significantEventsRepositoryClient },
  } = useKibana().services;

  return useQuery<EventLifecycleResponse, Error>({
    queryKey: ['nightshift.eventLifecycle', eventId],
    enabled: enabled && Boolean(eventId),
    queryFn: async ({ signal }) => {
      return significantEventsRepositoryClient.fetch(
        'GET /internal/significant_events/events/{id}/lifecycle',
        {
          params: { path: { id: eventId } },
          signal: signal ?? null,
        }
      );
    },
    refetchInterval: REFETCH_INTERVAL_MS,
  });
};
