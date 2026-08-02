/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Step-execution ids the Workflows execution-details view reserves for its two pseudo-steps
 * (`workflow_execution_detail.tsx`: `PSEUDO_STEP_OVERVIEW` / `PSEUDO_STEP_TRIGGER`). Neither
 * addresses a real step execution: `__overview` selects the run overview and `trigger` selects the
 * trigger row. A link that emitted one would silently land somewhere other than the step it names,
 * which reads exactly like a broken deep link, so they are never appended.
 */
export const RESERVED_STEP_EXECUTION_IDS: readonly string[] = ['__overview', 'trigger'];

export interface BuildRunDeepLinkParams {
  /** Workflow execution (run) id — deep-links to the specific execution. */
  executionId: string;
  /**
   * Step execution id (`stepExecutions[].id`) to select inside the execution, when the caller knows
   * which single step is the interesting one. Omitted (or empty) links to the execution overview;
   * a {@link RESERVED_STEP_EXECUTION_IDS} value is ignored for the same reason.
   */
  stepExecutionId?: string;
  /** Workflow id the Workflows app routes on (the execution's `workflowId`). */
  workflowId: string;
}

/**
 * Build the in-app path to a run's execution-details view in the Workflows app,
 * `/{workflowId}?tab=executions&executionId={runId}` — the same shape the Attack Discovery
 * "Generations" flyout uses (`use_workflow_editor_link/index.ts:105`). Every segment is
 * URL-encoded. This is a relative Workflows-app path; the caller prefixes the app mount.
 *
 * When a `stepExecutionId` is supplied the link is **step-level**:
 * `…&stepExecutionId={stepExecutionId}` (plan F1). The Workflows app already reads that param
 * (`use_workflow_url_state.ts`) and matches it against `stepExecutions[].id`
 * (`workflow_execution_detail.tsx`), so no Workflows change is needed — and without it every row
 * of a response shares one execution-level link.
 */
export const buildRunDeepLink = ({
  executionId,
  stepExecutionId,
  workflowId,
}: BuildRunDeepLinkParams): string => {
  const executionPath = `/${encodeURIComponent(
    workflowId
  )}?tab=executions&executionId=${encodeURIComponent(executionId)}`;

  if (
    stepExecutionId == null ||
    stepExecutionId === '' ||
    RESERVED_STEP_EXECUTION_IDS.includes(stepExecutionId)
  ) {
    return executionPath;
  }

  return `${executionPath}&stepExecutionId=${encodeURIComponent(stepExecutionId)}`;
};
