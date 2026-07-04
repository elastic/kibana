/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback } from 'react';
import type { HttpStart } from '@kbn/core/public';
import type { SigEvent } from '@kbn/streams-schema';

/**
 * v0 Nightshift landing page data hook. Deliberately thin — hits the same
 * internal route the existing streams_app debug UI uses
 * (`GET /internal/sig_events/events`), sorted client-side by recency since
 * the "which sort makes sense" question (criticality vs. time) was
 * explicitly punted by the 2026-07-02 design decision in favor of time.
 *
 * Not wired to the pipeline in any way — pure read. Seeding/generating
 * events is out of scope for this hook.
 */
export interface UseFetchSignificantEventsResult {
  events: SigEvent[];
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

interface EventsSearchResponse {
  hits: SigEvent[];
}

export function useFetchSignificantEvents(http: HttpStart): UseFetchSignificantEventsResult {
  const [events, setEvents] = useState<SigEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [refetchToken, setRefetchToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(undefined);

    http
      .get<EventsSearchResponse>('/internal/sig_events/events', {
        query: { perPage: 50 },
      })
      .then((response) => {
        if (cancelled) return;
        const sorted = [...response.hits].sort(
          (a, b) => Date.parse(b['@timestamp']) - Date.parse(a['@timestamp'])
        );
        setEvents(sorted);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [http, refetchToken]);

  const refetch = useCallback(() => setRefetchToken((n) => n + 1), []);

  return { events, isLoading, error, refetch };
}
