/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { HttpSetup } from '@kbn/core/public';
import {
  API_VERSIONS,
  ATTACK_DISCOVERY_GENERATIONS,
  type AttackDiscoveryGeneration,
  type GetAttackDiscoveryGenerationResponse,
} from '@kbn/elastic-assistant-common';
import { useQuery } from '@kbn/react-query';

const FAST_POLL_INTERVAL_MS = 10_000;
const SLOW_POLL_INTERVAL_MS = 30_000;
const SLOW_POLL_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

interface UseGetAttackDiscoveryGenerationProps {
  executionUuid: string | null | undefined;
  http: HttpSetup;
}

interface UseGetAttackDiscoveryGenerationResult {
  generation: AttackDiscoveryGeneration | undefined;
  isLoading: boolean;
}

/**
 * Fetches the current state of a single Attack Discovery generation by UUID.
 *
 * This hook is intentionally self-contained: it derives the authoritative
 * execution status directly from the Attack Discovery API rather than
 * relying on state passed in from a parent component, which can be stale
 * (e.g. a schedule execution log row that still shows "started" after the
 * run has already completed).
 *
 * Polling behaviour:
 * - Fetches once immediately on mount (when executionUuid is provided)
 * - Polls every 10 seconds while status is "started" and elapsed < 10 min
 * - Polls every 30 seconds while status is "started" and elapsed >= 10 min
 *   (handles runs that will never complete, e.g. because the server was
 *   killed, without burning unnecessary resources)
 * - Stops polling once a terminal status is reached
 */
export const useGetAttackDiscoveryGeneration = ({
  executionUuid,
  http,
}: UseGetAttackDiscoveryGenerationProps): UseGetAttackDiscoveryGenerationResult => {
  const queryFn = useCallback(async () => {
    const response = await http.fetch<GetAttackDiscoveryGenerationResponse>(
      `${ATTACK_DISCOVERY_GENERATIONS}/${encodeURIComponent(executionUuid ?? '')}`,
      {
        method: 'GET',
        version: API_VERSIONS.public.v1,
      }
    );

    return response.generation;
  }, [executionUuid, http]);

  const { data, isLoading } = useQuery(
    ['GET', ATTACK_DISCOVERY_GENERATIONS, executionUuid],
    queryFn,
    {
      enabled: executionUuid != null,
      refetchInterval: (latest: AttackDiscoveryGeneration | undefined) => {
        if (executionUuid == null) {
          return false;
        }

        // Stop polling once the execution reaches a terminal state
        if (latest != null && latest.status !== 'started') {
          return false;
        }

        // Use the execution's own start time to decide whether to slow down.
        // Fall back to fast polling if the start time is not yet available
        // (i.e. before the first successful fetch).
        const startMs = latest?.start != null ? new Date(latest.start).getTime() : Date.now();
        const elapsedMs = Date.now() - startMs;

        return elapsedMs >= SLOW_POLL_THRESHOLD_MS ? SLOW_POLL_INTERVAL_MS : FAST_POLL_INTERVAL_MS;
      },
      refetchOnWindowFocus: false,
      staleTime: 0,
    }
  );

  return {
    generation: data,
    isLoading,
  };
};
