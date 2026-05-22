/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { HttpSetup } from '@kbn/core/public';
import type { WorkflowExecutionsTracking } from '@kbn/elastic-assistant-common';

import { useWorkflowTracking } from '../../../hooks/use_workflow_tracking';

/**
 * Merges internally polled workflow tracking data with the tracking data
 * provided via props, and derives the effective workflow IDs used by the rest
 * of the flyout.
 *
 * Also computes `isTerminalStatus` so callers do not need to duplicate the
 * generation-status check.
 */
export const useEffectiveWorkflowTracking = ({
  executionUuid,
  generationStatus,
  http,
  workflowExecutions,
  workflowId,
  workflowRunId,
}: {
  executionUuid: string | undefined;
  generationStatus?: 'started' | 'succeeded' | 'failed' | 'canceled' | 'dismissed';
  http: HttpSetup;
  workflowExecutions: WorkflowExecutionsTracking | null | undefined;
  workflowId: string | null | undefined;
  workflowRunId: string | null | undefined;
}): {
  effectiveWorkflowExecutions: WorkflowExecutionsTracking | null | undefined;
  effectiveWorkflowId: string | null;
  effectiveWorkflowRunId: string | null | undefined;
  isTerminalStatus: boolean;
  pipelineDataRefetchIntervalMs: number;
} => {
  /** Poll every 5 s while the execution is still running; stop once terminal. */
  const PIPELINE_DATA_POLL_INTERVAL_MS = 5000;
  const isTerminalStatus =
    generationStatus === 'succeeded' ||
    generationStatus === 'failed' ||
    generationStatus === 'canceled' ||
    generationStatus === 'dismissed';

  // Poll for fresh tracking data internally so the flyout updates in real-time
  // regardless of the parent's polling lifecycle. Only poll while running.
  const { data: internalTrackingData } = useWorkflowTracking({
    executionId: !isTerminalStatus ? executionUuid ?? null : null,
    http,
  });

  // Derive effective tracking values by merging internal polling results with
  // whatever the parent already provided as props. Props take priority because
  // they may carry richer data (e.g. alert-retrieval arrays from ad-hoc runs).
  const effectiveWorkflowExecutions: WorkflowExecutionsTracking | null | undefined = useMemo(() => {
    if (internalTrackingData == null) return workflowExecutions;

    return {
      alertRetrieval:
        workflowExecutions?.alertRetrieval ??
        (internalTrackingData.alert_retrieval != null
          ? internalTrackingData.alert_retrieval.map((e) => ({
              workflowId: e.workflow_id,
              workflowRunId: e.workflow_run_id,
            }))
          : null),
      generation:
        workflowExecutions?.generation ??
        (internalTrackingData.generation != null
          ? {
              workflowId: internalTrackingData.generation.workflow_id,
              workflowRunId: internalTrackingData.generation.workflow_run_id,
            }
          : null),
      validation:
        workflowExecutions?.validation ??
        (internalTrackingData.validation != null
          ? {
              workflowId: internalTrackingData.validation.workflow_id,
              workflowRunId: internalTrackingData.validation.workflow_run_id,
            }
          : null),
    };
  }, [internalTrackingData, workflowExecutions]);

  const effectiveWorkflowId = workflowId ?? internalTrackingData?.generation?.workflow_id ?? null;

  // When the prop is a non-null string (run ID already resolved), use it directly.
  // When the prop is null or undefined (run ID not yet available), try the
  // internally-polled tracking data first so that the flyout can query execution
  // details as soon as the event-log tracking entry is indexed.
  //
  // Preserve the distinction between null (prop explicitly absent) and undefined
  // (prop not provided at all) when there is no tracking data, so callers that
  // assert on workflowRunId: undefined are not broken.
  const effectiveWorkflowRunId: string | null | undefined =
    workflowRunId != null
      ? workflowRunId
      : internalTrackingData?.generation?.workflow_run_id ?? workflowRunId;

  const pipelineDataRefetchIntervalMs = isTerminalStatus ? 0 : PIPELINE_DATA_POLL_INTERVAL_MS;

  return {
    effectiveWorkflowExecutions,
    effectiveWorkflowId,
    effectiveWorkflowRunId,
    isTerminalStatus,
    pipelineDataRefetchIntervalMs,
  };
};
