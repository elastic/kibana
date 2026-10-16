/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { EventSeriesResponse } from '@kbn/significant-events-detection-engine-plugin/common';
import { useKibana } from './use_kibana';
import { useFetchErrorToast } from './use_fetch_error_toast';
import {
  DETECTION_ENGINE_QUERY_KEY,
  DETECTION_ENGINE_REFETCH_INTERVAL_MS,
} from './detection_engine_query_keys';

/** Each signal's measured minutes around an event, refreshed while the event is in view. */
export function useDetectionEngineEventSeries(eventId: string) {
  const client = useKibana().dependencies.start.significantEventsDetectionEngine.repositoryClient;
  const onError = useFetchErrorToast();
  return useQuery<EventSeriesResponse, Error>({
    queryKey: [...DETECTION_ENGINE_QUERY_KEY, 'eventSeries', eventId],
    queryFn: ({ signal }) =>
      client.fetch('GET /internal/significant_events/detection_engine/events/{id}/series', {
        params: { path: { id: eventId } },
        signal: signal ?? null,
      }),
    refetchInterval: DETECTION_ENGINE_REFETCH_INTERVAL_MS,
    onError,
  });
}
