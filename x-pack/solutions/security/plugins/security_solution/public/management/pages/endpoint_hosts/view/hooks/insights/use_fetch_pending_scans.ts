/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useQuery } from '@kbn/react-query';
import type { GetPendingWorkflowInsightsResponse } from '../../../../../../../common/api/endpoint/workflow_insights/workflow_insights';
import type { WorkflowInsightType } from '../../../../../../../common/endpoint/types/workflow_insights';
import { WORKFLOW_INSIGHTS_PENDING_ROUTE } from '../../../../../../../common/endpoint/constants';
import { useKibana, useToasts } from '../../../../../../common/lib/kibana';
import { WORKFLOW_INSIGHTS } from '../../translations';

// Max polling duration: 5 minutes. If exceeded, treat as failure (zombie execution guard).
const POLLING_TIMEOUT_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 5000;

interface UseFetchPendingScansConfig {
  endpointId: string;
  insightTypes: WorkflowInsightType[];
  isPolling: boolean;
  scanTimestamp: number;
  onSuccess: () => void;
  onFailure: (failureReasons: string[]) => void;
}

export const useFetchPendingScans = ({
  endpointId,
  insightTypes,
  isPolling,
  scanTimestamp,
  onSuccess,
  onFailure,
}: UseFetchPendingScansConfig) => {
  const { http } = useKibana().services;
  const toasts = useToasts();
  const pollStartedAt = useRef<number | null>(null);

  // Reset poll timer when scanTimestamp changes (endpoint switch or new scan click).
  useEffect(() => {
    pollStartedAt.current = null;
  }, [scanTimestamp]);

  const query = useQuery<
    GetPendingWorkflowInsightsResponse,
    Error,
    GetPendingWorkflowInsightsResponse
  >(
    [`fetchPendingScans-${endpointId}`, scanTimestamp],
    async ({ signal }) => {
      try {
        return await http.get<GetPendingWorkflowInsightsResponse>(WORKFLOW_INSIGHTS_PENDING_ROUTE, {
          version: '1',
          query: {
            insightTypes: JSON.stringify(insightTypes),
            endpointIds: JSON.stringify([endpointId]),
          },
          signal,
        });
      } catch (error) {
        if (error.name === 'AbortError') {
          return { pending: [] };
        }
        throw error;
      }
    },
    {
      refetchOnWindowFocus: false,
      // Only fetch when actively polling. Prevents premature fetch when scanTimestamp
      // changes (onScanButtonClick) but isPolling is still false (POST hasn't completed).
      // Without this, React Query fires an initial fetch for the new query key that
      // returns { pending: [] } before the execution exists, caching a false "empty" result.
      enabled: isPolling,
      // Discard cached data when the component unmounts. Without this, re-mounting
      // serves stale { pending: [] } from a previous mount, causing the mount poll
      // to immediately report "no scan running" even when one is in progress.
      cacheTime: 0,
      refetchInterval: () => {
        if (!isPolling) return false;

        // Initialize poll start time on first poll
        if (pollStartedAt.current === null) {
          pollStartedAt.current = Date.now();
        }

        // Timeout guard: if polling has exceeded the max duration, stop
        if (Date.now() - pollStartedAt.current > POLLING_TIMEOUT_MS) {
          return false;
        }

        return POLL_INTERVAL_MS;
      },
      onError: (error) => {
        if ((error as Error & { name?: string }).name !== 'AbortError') {
          toasts.addDanger({
            title: WORKFLOW_INSIGHTS.toasts.fetchPendingInsightsError,
            text: (error as Error).message,
          });
          onFailure([]);
        }
      },
    }
  );

  const { data } = query;

  // Handle side effects (success/failure/timeout) after render, not during
  // refetchInterval evaluation. This avoids the race condition where stale
  // cached data triggers onSuccess before the new fetch completes.
  useEffect(() => {
    if (!isPolling) return;

    // Timeout check
    if (pollStartedAt.current !== null && Date.now() - pollStartedAt.current > POLLING_TIMEOUT_MS) {
      pollStartedAt.current = null;
      toasts.addDanger({
        title: WORKFLOW_INSIGHTS.toasts.fetchPendingInsightsError,
        text: WORKFLOW_INSIGHTS.toasts.scanTimedOut,
      });
      onFailure([]);
      return;
    }

    if (!data) return;

    const { pending } = data;

    const hasActive = pending.some(
      (exec) => exec.status === 'running' || exec.status === 'scheduled'
    );

    if (hasActive) {
      // Running/scheduled executions found — keep polling
      return;
    }

    if (pending.length === 0) {
      // No pending executions — scan complete (or no scan running)
      pollStartedAt.current = null;
      onSuccess();
      return;
    }

    // Only terminal (failed/aborted) remain — signal failure.
    // The component controls whether onFailure shows an error toast (user-triggered scan)
    // or is a no-op (mount poll where terminal executions are stale and irrelevant).
    pollStartedAt.current = null;
    const failureReasons = pending
      .map((exec) => exec.failureReason)
      .filter((reason): reason is string => !!reason);
    onFailure(failureReasons);
  }, [isPolling, data, onSuccess, onFailure, toasts]);

  return query;
};
