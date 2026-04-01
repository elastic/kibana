/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { HttpSetup, IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { WorkflowExecutionsTracking } from '@kbn/elastic-assistant-common';
import { useQuery } from '@kbn/react-query';
import { ExecutionStatus } from '@kbn/workflows/types/v1';
import type { WorkflowExecutionDto } from '@kbn/workflows/types/latest';
import { isTerminalStatus } from '@kbn/workflows/types/utils';

import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { applyGenerationStatusOverride } from './apply_generation_status_override';
import { buildAggregatedWorkflowExecution } from './helpers/build_aggregated_workflow_execution';
import { buildStubWorkflowExecution } from './build_stub_workflow_execution';
import { buildWorkflowExecutionTargets } from './helpers/build_workflow_execution_targets';
import type { AggregatedWorkflowExecution } from '../../loading_callout/types';
import * as i18n from './translations';

type ServerError = IHttpFetchError<ResponseErrorBody>;

const POLLING_INTERVAL_MS = 1000;

interface UseWorkflowExecutionDetailsProps {
  executionUuid?: string | null;
  http: HttpSetup;
  stubData?: {
    alertsContextCount?: number | null;
    discoveriesCount?: number | null;
    eventActions?: string[] | null;
    generationStatus?: 'started' | 'succeeded' | 'failed' | 'canceled' | 'dismissed';
  };
  workflowId?: string | null;
  workflowExecutions?: WorkflowExecutionsTracking | null;
  workflowRunId: string | null | undefined;
}

interface UseWorkflowExecutionDetails {
  data: AggregatedWorkflowExecution | undefined;
  error: unknown | undefined;
  isLoading: boolean;
}

/**
 * Hook that fetches workflow execution details and polls for real-time updates during execution.
 *
 * Features:
 * - Fetches step executions from /api/workflowExecutions/{workflowRunId}
 * - Aggregates steps across alert retrieval, generation, and validation workflows
 * - Polls every 1s while any workflow execution is running
 * - Stops polling when all workflows reach terminal status
 * - Returns aggregated step executions with workflow links
 * - Handles loading/error states
 *
 * @param executionUuid - The execution UUID for cache scoping
 * @param http - Kibana HTTP service for making API requests
 * @param workflowExecutions - Workflow execution tracking from the event log
 * @param workflowId - The workflow definition ID for fallback linking
 * @param workflowRunId - The workflow execution ID for fallback fetching
 * @returns An object containing the workflow execution data, error state, and loading state
 *
 * @example
 * ```typescript
 * const { data, error, isLoading } = useWorkflowExecutionDetails({
 *   http,
 *   workflowRunId: 'run-123'
 * });
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <ErrorMessage />;
 * if (data) return <WorkflowDetails execution={data} />;
 * ```
 */
export const useWorkflowExecutionDetails = ({
  executionUuid,
  http,
  stubData,
  workflowId,
  workflowExecutions,
  workflowRunId,
}: UseWorkflowExecutionDetailsProps): UseWorkflowExecutionDetails => {
  const { addError } = useAppToasts();
  const abortController = useRef(new AbortController());
  const [shouldPoll, setShouldPoll] = useState(true);

  const workflowExecutionTargets = useMemo(
    () =>
      buildWorkflowExecutionTargets({
        workflowExecutions,
        workflowId,
        workflowRunId,
      }),
    [workflowExecutions, workflowId, workflowRunId]
  );

  const workflowExecutionRunIds = useMemo(
    () => workflowExecutionTargets.map((target) => target.workflowRunId),
    [workflowExecutionTargets]
  );

  const cancelRequest = useCallback(() => {
    abortController.current.abort();
    abortController.current = new AbortController();
  }, []);

  const queryFn = useCallback(async () => {
    if (workflowExecutionTargets.length === 0) {
      return undefined;
    }

    // Filter to only real (non-stub) workflow execution targets
    const realTargets = workflowExecutionTargets.filter(
      (target) => !target.workflowRunId.startsWith('stub-')
    );

    // TODO: Remove this stub path once workflows execution details
    // are always available via /api/workflowExecutions/{id} (blocked by PR #246446).
    // TODO: Remove stubData plumbing into this hook post PR #246446.
    // Only fall back to stub data if there are NO real workflow execution IDs available
    if (realTargets.length === 0) {
      // Use the first stub ID for building stub execution data
      const stubWorkflowRunId = workflowExecutionTargets[0]?.workflowRunId ?? `stub-${Date.now()}`;

      return buildAggregatedWorkflowExecution({
        executions: [buildStubWorkflowExecution(stubWorkflowRunId, stubData ?? {})],
        workflowExecutions,
      });
    }

    // Fetch real workflow execution details from the API.
    // Use Promise.allSettled so that a single 404 (e.g. from a synthetic
    // workflowRunId for a disabled custom alert retrieval workflow) does not
    // cause the entire panel to fail. Successfully-fetched executions are
    // rendered normally; missing ones appear as pipeline placeholders.
    const settled = await Promise.allSettled(
      realTargets.map((target) =>
        http.fetch<WorkflowExecutionDto>(`/api/workflows/executions/${target.workflowRunId}`, {
          method: 'GET',
          signal: abortController.current.signal,
        })
      )
    );

    const executions = settled
      .filter((o): o is PromiseFulfilledResult<WorkflowExecutionDto> => o.status === 'fulfilled')
      .map((o) => o.value);

    const successfulTargets = realTargets.filter((_, i) => settled[i].status === 'fulfilled');

    const failedAlertRetrievalTargets = realTargets.filter(
      (target, i) => settled[i].status === 'rejected' && target.pipelinePhase === 'retrieve_alerts'
    );

    const aggregated = buildAggregatedWorkflowExecution({
      executions,
      failedTargets: failedAlertRetrievalTargets,
      targets: successfulTargets,
      workflowExecutions,
    });

    return applyGenerationStatusOverride({
      aggregatedExecution: aggregated,
      generationStatus: stubData?.generationStatus,
    });
  }, [http, stubData, workflowExecutionTargets, workflowExecutions]);

  const { data, error, isLoading } = useQuery(
    ['GET', '/api/workflows/executions', executionUuid, ...workflowExecutionRunIds],
    queryFn,
    {
      enabled: workflowExecutionRunIds.length > 0,
      onError: (e: ServerError) => {
        addError(e.body && e.body.message ? new Error(e.body.message) : e, {
          title: i18n.ERROR_RETRIEVING_WORKFLOW_EXECUTION_DETAILS,
        });
        setShouldPoll(false);
      },
      refetchInterval: shouldPoll ? POLLING_INTERVAL_MS : false,
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: false,
    }
  );

  // Stop polling when execution reaches terminal state AND all pipeline steps have real data.
  // The validation workflow run ID may not be available until the next generations refetch
  // (every ~10s). If there are still PENDING placeholder steps (no workflowRunId), the
  // pipeline is not truly complete yet and we must keep polling so that the step indicators
  // and timing information update promptly when validation data arrives.
  useEffect(() => {
    if (data == null) {
      return;
    }

    const hasPendingPlaceholders = data.steps.some(
      (step) => step.status === ExecutionStatus.PENDING && step.workflowRunId == null
    );

    if (isTerminalStatus(data.status) && !hasPendingPlaceholders) {
      setShouldPoll(false);
    }
  }, [data]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelRequest();
    };
  }, [cancelRequest]);

  return {
    data,
    error,
    isLoading,
  };
};
