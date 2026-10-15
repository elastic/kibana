/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@kbn/react-query';
import { useKibana } from './use_kibana';
import { DETECTION_ENGINE_QUERY_KEY } from './detection_engine_query_keys';

/**
 * Shorter than a bucket, so a completed bucket is evaluated within seconds. The server skips
 * buckets it already evaluated, and each call keeps the lab's logs flowing in near real time.
 */
const AUTO_RUN_INTERVAL_MS = 15_000;

/**
 * Asks the server to run the engine on a timer while the page is open. The prototype's stand-in
 * for the scheduled workflow a production engine would use.
 */
export function useDetectionEngineAutoRun({ enabled }: { enabled: boolean }): void {
  const client = useKibana().dependencies.start.significantEvents.significantEventsRepositoryClient;
  const queryClient = useQueryClient();

  useEffect(() => {
    // External system: a browser timer driving server runs. Silent on purpose; the page shows
    // each run's result, and a toast every 15 seconds would bury everything else.
    if (!enabled) {
      return;
    }
    const tick = () =>
      client
        .fetch('POST /internal/significant_events/detection_engine/_run', { signal: null })
        .then(() => queryClient.invalidateQueries({ queryKey: DETECTION_ENGINE_QUERY_KEY }))
        .catch(() => undefined);
    tick();
    const interval = setInterval(tick, AUTO_RUN_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled, client, queryClient]);
}
