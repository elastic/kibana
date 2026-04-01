/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  WorkflowExecutionReference,
  WorkflowExecutionsTracking,
} from '@kbn/elastic-assistant-common';

export interface WorkflowExecutionTarget {
  pipelinePhase?: string;
  workflowId?: string;
  workflowName?: string;
  workflowRunId: string;
}

const toTarget = (
  execution: WorkflowExecutionReference,
  pipelinePhase?: string
): WorkflowExecutionTarget => ({
  pipelinePhase,
  workflowId: execution.workflowId,
  workflowName: execution.workflowName,
  workflowRunId: execution.workflowRunId,
});

export const buildWorkflowExecutionTargets = ({
  workflowExecutions,
  workflowId,
  workflowRunId,
}: {
  workflowExecutions?: WorkflowExecutionsTracking | null;
  workflowId?: string | null;
  workflowRunId?: string | null;
}): WorkflowExecutionTarget[] => {
  const alertRetrievalRefs = workflowExecutions?.alertRetrieval;
  const alertRetrievalTargets: WorkflowExecutionTarget[] = Array.isArray(alertRetrievalRefs)
    ? alertRetrievalRefs
        .filter((ref): ref is WorkflowExecutionReference => ref != null)
        .map((ref) => toTarget(ref, 'retrieve_alerts'))
    : [];

  const generationTarget: WorkflowExecutionTarget[] =
    workflowExecutions?.generation != null
      ? [toTarget(workflowExecutions.generation, 'generate_discoveries')]
      : [];

  const validationTarget: WorkflowExecutionTarget[] =
    workflowExecutions?.validation != null
      ? [toTarget(workflowExecutions.validation, 'validate_discoveries')]
      : [];

  const baseTargets = [...alertRetrievalTargets, ...generationTarget, ...validationTarget];

  const fallbackTarget: WorkflowExecutionTarget[] =
    workflowRunId != null && !baseTargets.some((target) => target.workflowRunId === workflowRunId)
      ? [{ workflowId: workflowId ?? undefined, workflowRunId }]
      : [];

  const allTargets = [...baseTargets, ...fallbackTarget];

  const seenRunIds = new Set<string>();

  return allTargets.filter((target) => {
    if (seenRunIds.has(target.workflowRunId)) {
      return false;
    }

    seenRunIds.add(target.workflowRunId);

    return true;
  });
};
