/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { EventEvidenceResponse } from '@kbn/significant-events-detection-engine-plugin/common';
import { useKibana } from './use_kibana';
import { useFetchErrorToast } from './use_fetch_error_toast';
import { DETECTION_ENGINE_QUERY_KEY } from './detection_engine_query_keys';

/**
 * The rows one signal's evidence query returns now. It runs only once asked for, since it reads
 * the customer's data, and never polls: the rows are a snapshot a person is reading.
 */
export function useDetectionEngineEvidence({
  eventId,
  fingerprint,
  enabled,
}: {
  eventId: string;
  fingerprint: string;
  enabled: boolean;
}) {
  const client = useKibana().dependencies.start.significantEventsDetectionEngine.repositoryClient;
  const onError = useFetchErrorToast();
  return useQuery<EventEvidenceResponse, Error>({
    queryKey: [...DETECTION_ENGINE_QUERY_KEY, 'evidence', eventId, fingerprint],
    queryFn: ({ signal }) =>
      client.fetch('GET /internal/significant_events/detection_engine/events/{id}/evidence', {
        params: { path: { id: eventId }, query: { fingerprint } },
        signal: signal ?? null,
      }),
    enabled,
    staleTime: Infinity,
    onError,
  });
}
