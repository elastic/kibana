/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowDetailDto } from '@kbn/workflows';

type ExecutableWorkflow = WorkflowDetailDto & {
  definition: NonNullable<WorkflowDetailDto['definition']>;
  enabled: true;
  valid: true;
};

export type WorkflowValidationResult =
  | {
      executable: false;
      reason: string;
    }
  | {
      executable: true;
      workflow: ExecutableWorkflow;
    };

/**
 * Validates whether a workflow can be executed.
 *
 * A workflow is executable if ALL of the following conditions are met:
 * 1. The workflow exists (not null/undefined)
 * 2. The workflow is valid (passes schema validation)
 * 3. The workflow has a definition (contains executable steps)
 * 4. The workflow is enabled (not disabled by user)
 *
 * This validation pattern matches the standard used by the workflows REST API
 * endpoints (e.g., POST /api/workflows/{id}/run) and should be used consistently
 * across all workflow execution paths.
 *
 * @param workflow - The workflow to validate (may be null if not found)
 * @param workflowId - The workflow ID (for error messages)
 * @returns Validation result with executable flag and optional reason for failure
 *
 * @example
 * ```typescript
 * const workflow = await workflowsApi.getWorkflow('my-workflow', spaceId);
 * const validation = validateWorkflowExecutable(workflow, 'my-workflow');
 *
 * if (!validation.executable) {
 *   logger.warn(`Cannot execute workflow: ${validation.reason}`);
 *   // Fall back to alternative logic
 * } else {
 *   const executionId = await workflowsApi.runWorkflow(...);
 * }
 * ```
 */
export const validateWorkflowExecutable = (
  workflow: WorkflowDetailDto | null,
  workflowId: string
): WorkflowValidationResult => {
  if (!workflow) {
    return {
      executable: false,
      reason: `Workflow '${workflowId}' not found`,
    };
  }

  if (!workflow.valid) {
    return {
      executable: false,
      reason: `Workflow '${workflowId}' is not valid`,
    };
  }

  if (!workflow.definition) {
    return {
      executable: false,
      reason: `Workflow '${workflowId}' is missing a definition`,
    };
  }

  if (!workflow.enabled) {
    return {
      executable: false,
      reason: `Workflow '${workflowId}' is disabled`,
    };
  }

  const executableWorkflow: ExecutableWorkflow = {
    ...workflow,
    definition: workflow.definition,
    enabled: true,
    valid: true,
  };

  return {
    executable: true,
    workflow: executableWorkflow,
  };
};
