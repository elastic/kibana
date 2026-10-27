/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-security';
import { isTerminalStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows';

export const runWorkflow = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  workflowId: string,
  inputs: Record<string, unknown> = {}
): Promise<string> => {
  const res = await apiClient.post(`/api/workflows/workflow/${workflowId}/run`, {
    headers,
    responseType: 'json',
    body: { inputs },
  });
  if (res.statusCode !== 200) {
    throw new Error(`Run ${workflowId}: status ${res.statusCode} ${JSON.stringify(res.body)}`);
  }
  return (res.body as { workflowExecutionId: string }).workflowExecutionId;
};

export const waitForExecution = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  workflowExecutionId: string,
  timeoutMs: number
): Promise<WorkflowExecutionDto> => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const res = await apiClient.get(
      `/api/workflows/executions/${workflowExecutionId}?includeOutput=true`,
      { headers, responseType: 'json' }
    );
    if (res.statusCode !== 200) {
      throw new Error(`Execution ${workflowExecutionId}: status ${res.statusCode}`);
    }
    const execution = res.body as WorkflowExecutionDto;
    if (isTerminalStatus(execution.status)) {
      return execution;
    }
    if (Date.now() > deadline) {
      throw new Error(
        `Execution ${workflowExecutionId} still ${execution.status} after ${timeoutMs}ms`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};

/** The finish record; enter/scope records for the same stepId carry `output: null`. */
export const findStepOutput = (
  execution: WorkflowExecutionDto,
  stepId: string
): WorkflowStepExecutionDto['output'] =>
  [...execution.stepExecutions]
    .reverse()
    .find((step) => step.stepId === stepId && step.output != null)?.output;
