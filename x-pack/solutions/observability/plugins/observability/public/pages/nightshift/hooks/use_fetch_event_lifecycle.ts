/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, type UseQueryResult } from '@kbn/react-query';
import type { EventLifecycleResponse } from '@kbn/significant-events-schema';
import { useKibana } from '../../../utils/kibana_react';

// Keeps the flyout fresh while it stays open during a live incident.
const REFETCH_INTERVAL_MS = 60_000;

/**
 * Fetches the lifecycle chain of a significant event: its change-point
 * detections, discoveries, and stored event versions.
 */
export const useFetchEventLifecycle = (
  eventId: string
): UseQueryResult<EventLifecycleResponse, Error> => {
  const { http } = useKibana().services;

  return useQuery<EventLifecycleResponse, Error>({
    queryKey: ['nightshift.eventLifecycle', eventId],
    queryFn: async ({ signal }) => {
      return http.get<EventLifecycleResponse>(
        `/internal/significant_events/events/${encodeURIComponent(eventId)}/lifecycle`,
        { signal }
      );
    },
    refetchInterval: REFETCH_INTERVAL_MS,
  });
};
