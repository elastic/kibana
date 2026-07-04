/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { HttpStart } from '@kbn/core/public';
import type { Detection } from '@kbn/streams-schema';

/**
 * Client-side-only event_id -> detection_id[] lookup. In the real system
 * this association is mediated by Discovery documents (a Discovery embeds
 * `detections[]`, and an Event carries a `discovery_slug` back to it) — see
 * `threads/nightshift-rd/artifacts/07-sig-event-data-model-walkthrough.md`
 * §2.1 for the full join. Discovery is explicitly cut from this v0 pass, so
 * this hardcoded map stands in for that relationship for our 3 seeded demo
 * events. Not a real pattern to carry forward past this branch.
 */
const EVENT_ID_TO_DETECTION_IDS: Record<string, string[]> = {
  'evt-demo-transactionhistory-1': ['d-txhist-sql-conn-failure', 'd-txhist-hikari-restart'],
  'evt-demo-cdn-blip-1': ['d-cdn-5xx-recovered'],
  'evt-demo-checkout-latency-1': ['d-checkout-gw-latency'],
};

export function getDetectionIdsForEvent(eventId: string): string[] {
  return EVENT_ID_TO_DETECTION_IDS[eventId] ?? [];
}

interface DetectionsSearchResponse {
  hits: Detection[];
}

/**
 * Fetches all Detections once and returns them keyed by `detection_id`.
 * "Symptoms" in Kate's prototype maps to this concept, not the SigEvent's
 * own `evidences[]` field (which stays as-is inside RootCauseCard).
 */
export function useFetchDetections(http: HttpStart) {
  const [detectionsById, setDetectionsById] = useState<Record<string, Detection>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    http
      .get<DetectionsSearchResponse>('/internal/sig_events/detections', {
        query: { perPage: 100 },
      })
      .then((response) => {
        if (cancelled) return;
        const byId: Record<string, Detection> = {};
        for (const detection of response.hits) {
          byId[detection.detection_id] = detection;
        }
        setDetectionsById(byId);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [http]);

  return { detectionsById, isLoading };
}
