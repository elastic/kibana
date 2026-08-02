/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowStepExecutionDto } from '@kbn/workflows';

/**
 * Composite identifier that makes a paused `waitForInput` step uniquely addressable
 * from the proposals queue. Format: `workflowId:workflowRunId:stepExecutionId`.
 *
 * Mirrors the Workflows inbox provider's `buildWorkflowSourceId`
 * (`workflows_management/server/inbox/to_inbox_action.ts`) so both surfaces address
 * the same step the same way, but is defined locally: PND must make no change to
 * workflows-eng-owned files, and that helper is internal to the plugin.
 *
 * `workflowRunId` is the execution id the resume API needs; `stepExecutionId` is the
 * exact paused step so a stale response cannot resume a later gate from the same run.
 */
export const buildProposalSourceId = ({
  stepExecutionId,
  workflowId,
  workflowRunId,
}: {
  stepExecutionId: string;
  workflowId: string;
  workflowRunId: string;
}): string => `${workflowId}:${workflowRunId}:${stepExecutionId}`;

/** Build a proposal source id directly from a paused step execution. */
export const buildProposalSourceIdFromStep = (step: WorkflowStepExecutionDto): string =>
  buildProposalSourceId({
    stepExecutionId: step.id,
    workflowId: step.workflowId,
    workflowRunId: step.workflowRunId,
  });

export interface ParsedProposalSourceId {
  stepExecutionId: string;
  workflowId: string;
  workflowRunId: string;
}

/**
 * Parse a proposal source id back into its parts. Returns `null` when the id is
 * malformed or any part is empty — the `_respond` handler treats that as a 400,
 * never guessing a workflow id (security finding S1: the workflow id it resumes is
 * re-derived from the execution, never trusted from this untrusted client value).
 *
 * The step execution id is re-joined from the remaining segments so an id that
 * itself contains a colon round-trips (defensive; ids are UUIDs today).
 */
export const parseProposalSourceId = (sourceId: string): ParsedProposalSourceId | null => {
  const parts = sourceId.split(':');
  if (parts.length < 3) {
    return null;
  }

  const [workflowId, workflowRunId, ...rest] = parts;
  const stepExecutionId = rest.join(':');

  if (workflowId.length === 0 || workflowRunId.length === 0 || stepExecutionId.length === 0) {
    return null;
  }

  return { stepExecutionId, workflowId, workflowRunId };
};
