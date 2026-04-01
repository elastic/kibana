/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { HttpSetup } from '@kbn/core/public';
import { useQuery } from '@kbn/react-query';

export interface WorkflowTrackingEntry {
  workflow_id: string;
  workflow_run_id: string;
}

export interface WorkflowTrackingResponse {
  alert_retrieval: WorkflowTrackingEntry[] | null;
  generation: WorkflowTrackingEntry | null;
  validation: WorkflowTrackingEntry | null;
}

interface UseWorkflowTrackingProps {
  executionId: string | null;
  http: HttpSetup;
}

interface UseWorkflowTrackingResult {
  data: WorkflowTrackingResponse | undefined;
  error: unknown;
  isError: boolean;
  isLoading: boolean;
}

const WORKFLOW_TRACKING_QUERY_KEY = 'GET_WORKFLOW_TRACKING';

const EMPTY_TRACKING: WorkflowTrackingResponse = {
  alert_retrieval: null,
  generation: null,
  validation: null,
};

const getErrorStatusCode = (error: unknown): number | undefined => {
  const maybeError = error as {
    body?: { statusCode?: number };
    response?: { status?: number };
    status?: number;
  };

  return maybeError.body?.statusCode ?? maybeError.response?.status ?? maybeError.status;
};

/**
 * Resolves workflow tracking data (workflowId, workflowRunId) for a given
 * rule execution UUID. This data is required to open the
 * WorkflowExecutionDetailsFlyout from the schedule execution logs.
 *
 * The query is disabled until `executionId` is non-null, enabling lazy
 * fetching on demand (e.g., when the user clicks "View execution details").
 */
export const useWorkflowTracking = ({
  executionId,
  http,
}: UseWorkflowTrackingProps): UseWorkflowTrackingResult => {
  const abortController = useRef(new AbortController());
  const pollingStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    pollingStartedAtRef.current = executionId != null ? Date.now() : null;
  }, [executionId]);

  const queryFn = useCallback(async () => {
    abortController.current = new AbortController();

    const id = executionId ?? '';
    try {
      const response = await http.fetch<WorkflowTrackingResponse>(
        `/internal/attack_discovery/executions/${encodeURIComponent(id)}/tracking`,
        {
          method: 'GET',
          signal: abortController.current.signal,
          version: '1',
        }
      );

      return response;
    } catch (error) {
      // The event log is eventually consistent; if the tracking entry has not
      // been indexed yet, treat 404 as "not ready" rather than a terminal error
      // so the caller can poll until tracking data is available.
      if (getErrorStatusCode(error) === 404) {
        return EMPTY_TRACKING;
      }

      throw error;
    }
  }, [executionId, http]);

  const { data, error, isError, isFetching, isLoading } = useQuery(
    [WORKFLOW_TRACKING_QUERY_KEY, executionId],
    queryFn,
    {
      enabled: executionId != null,
      refetchInterval: (latest: WorkflowTrackingResponse | undefined) => {
        if (executionId == null) {
          return false;
        }

        const startedAt = pollingStartedAtRef.current ?? Date.now();
        const MAX_POLLING_MS = 60_000;
        if (Date.now() - startedAt > MAX_POLLING_MS) {
          return false;
        }

        const effective = latest ?? EMPTY_TRACKING;
        const hasGeneration = effective.generation != null;
        const hasValidation = effective.validation != null;

        // Poll until we see generation + validation (or we time out).
        return hasGeneration && hasValidation ? false : 2000;
      },
      refetchOnWindowFocus: false,
      staleTime: 0,
    }
  );

  return {
    data,
    error,
    isError,
    isLoading: isLoading && isFetching,
  };
};
