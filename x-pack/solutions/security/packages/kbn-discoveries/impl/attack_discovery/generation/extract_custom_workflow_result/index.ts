/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';

import { normalizeLastStepOutput } from '../normalize_last_step_output';

/**
 * Result extracted from a custom alert retrieval workflow.
 *
 * Custom workflows (e.g., ES|QL-based) produce raw (non-anonymized) alerts.
 * The alerts are CSV-formatted strings (one field per line, sorted
 * alphabetically) suitable for passing to the generation step alongside
 * (or instead of) legacy anonymized alerts.
 */
export interface CustomWorkflowAlertResult {
  /** CSV-formatted alert strings (one field per line: `fieldName,value1,value2,...`) */
  alerts: string[];
  /** Number of alerts retrieved */
  alertsContextCount: number;
  /** Source workflow ID */
  workflowId: string;
  /** Source workflow run ID */
  workflowRunId: string;
}

/**
 * Returns the last non-trigger step execution that has output,
 * or `undefined` if none exists.
 */
const findLastStepWithOutput = (
  stepExecutions: WorkflowExecutionDto['stepExecutions']
): WorkflowExecutionDto['stepExecutions'][number] | undefined => {
  for (let i = stepExecutions.length - 1; i >= 0; i--) {
    const step = stepExecutions[i];

    if (step.stepId !== 'trigger' && step.output != null) {
      return step;
    }
  }

  return undefined;
};

/**
 * Extracts alert data from a custom workflow execution.
 *
 * Finds the last completed non-trigger step with output and normalizes
 * its output into an array of alert strings using `normalizeLastStepOutput`.
 *
 * Throws if the workflow execution failed, was cancelled, or timed out.
 */
export const extractCustomWorkflowResult = ({
  execution,
  workflowId,
  workflowRunId,
}: {
  execution: WorkflowExecutionDto;
  workflowId: string;
  workflowRunId: string;
}): CustomWorkflowAlertResult => {
  if (execution.status === 'failed') {
    const errorMessage = execution.error?.message ?? 'Unknown error';
    throw new Error(`Custom alert retrieval workflow ${workflowId} failed: ${errorMessage}`);
  }

  if (execution.status === 'cancelled') {
    throw new Error(
      `Alert retrieval workflow (id: ${workflowId}) was cancelled. This may indicate a concurrent execution or manual cancellation. Retry generation.`
    );
  }

  if (execution.status === 'timed_out') {
    throw new Error(
      `Alert retrieval workflow (id: ${workflowId}) timed out. Consider increasing the workflow timeout or reducing the alert count.`
    );
  }

  const lastStep = findLastStepWithOutput(execution.stepExecutions);

  if (lastStep == null) {
    return {
      alerts: [],
      alertsContextCount: 0,
      workflowId,
      workflowRunId,
    };
  }

  const alerts = normalizeLastStepOutput(lastStep.output);

  return {
    alerts,
    alertsContextCount: alerts.length,
    workflowId,
    workflowRunId,
  };
};
