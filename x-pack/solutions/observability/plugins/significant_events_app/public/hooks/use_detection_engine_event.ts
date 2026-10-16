/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { EngineEventDetailsResponse } from '@kbn/significant-events-detection-engine-plugin/common';
import { useKibana } from './use_kibana';
import { useFetchErrorToast } from './use_fetch_error_toast';
import {
  DETECTION_ENGINE_QUERY_KEY,
  DETECTION_ENGINE_REFETCH_INTERVAL_MS,
} from './detection_engine_query_keys';

/** One event with its detections and activity trail. */
export function useDetectionEngineEvent(eventId: string | undefined) {
  const client = useKibana().dependencies.start.significantEventsDetectionEngine.repositoryClient;
  const onError = useFetchErrorToast();
  return useQuery<EngineEventDetailsResponse, Error>({
    queryKey: [...DETECTION_ENGINE_QUERY_KEY, 'event', eventId],
    queryFn: ({ signal }) =>
      client.fetch('GET /internal/significant_events/detection_engine/events/{id}', {
        params: { path: { id: eventId! } },
        signal: signal ?? null,
      }),
    enabled: eventId !== undefined,
    refetchInterval: DETECTION_ENGINE_REFETCH_INTERVAL_MS,
    onError,
  });
}
