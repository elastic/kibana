/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { ServiceSummary } from '@kbn/significant-events-plugin/common';
import { useKibana } from './use_kibana';
import { useFetchErrorToast } from './use_fetch_error_toast';
import {
  DETECTION_ENGINE_QUERY_KEY,
  DETECTION_ENGINE_REFETCH_INTERVAL_MS,
} from './detection_engine_query_keys';

/** What the engine watches and found, by service. */
export function useDetectionEngineServices() {
  const client = useKibana().dependencies.start.significantEvents.significantEventsRepositoryClient;
  const onError = useFetchErrorToast();
  return useQuery<{ services: ServiceSummary[] }, Error>({
    queryKey: [...DETECTION_ENGINE_QUERY_KEY, 'services'],
    queryFn: ({ signal }) =>
      client.fetch('GET /internal/significant_events/detection_engine/services', {
        signal: signal ?? null,
      }),
    refetchInterval: DETECTION_ENGINE_REFETCH_INTERVAL_MS,
    onError,
  });
}
