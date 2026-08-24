/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import { isTerminalStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto } from '@kbn/workflows';

const POLL_TIMEOUT_MS = 30_000;

export interface ApiClient {
  get(
    url: string,
    options?: { headers?: Record<string, string>; responseType?: 'json' }
  ): Promise<{ statusCode: number; body: unknown }>;
  post(
    url: string,
    options?: { headers?: Record<string, string>; responseType?: 'json'; body?: unknown }
  ): Promise<{ statusCode: number; body: unknown }>;
  delete(
    url: string,
    options?: { headers?: Record<string, string> }
  ): Promise<{ statusCode: number; body: unknown }>;
}

export const createWorkflow = async (
  apiClient: ApiClient,
  headers: Record<string, string>,
  yaml: string
): Promise<string> => {
  const res = await apiClient.post('/api/workflows/workflow', {
    headers,
    responseType: 'json',
    body: { yaml },
  });
  expect(res).toHaveStatusCode(200);
  return (res.body as { id: string }).id;
};

export const deleteWorkflow = async (
  apiClient: ApiClient,
  headers: Record<string, string>,
  workflowId: string
): Promise<void> => {
  await apiClient.delete(`/api/workflows/workflow/${workflowId}?force=true`, { headers });
};

export const runWorkflow = async (
  apiClient: ApiClient,
  headers: Record<string, string>,
  workflowId: string
): Promise<string> => {
  const res = await apiClient.post(`/api/workflows/workflow/${workflowId}/run`, {
    headers,
    responseType: 'json',
    body: { inputs: {} },
  });
  expect(res).toHaveStatusCode(200);
  return (res.body as { workflowExecutionId: string }).workflowExecutionId;
};

export const getExecution = async (
  apiClient: ApiClient,
  headers: Record<string, string>,
  workflowExecutionId: string
): Promise<WorkflowExecutionDto> => {
  const res = await apiClient.get(
    `/api/workflows/executions/${workflowExecutionId}?includeOutput=true`,
    { headers, responseType: 'json' }
  );
  expect(res).toHaveStatusCode(200);
  return res.body as WorkflowExecutionDto;
};

// No shared polling utility is exposed outside workflows_management's own test package,
// so this reimplements the same terminal-status wait used by its Scout suite.
export const waitForExecution = async (
  apiClient: ApiClient,
  headers: Record<string, string>,
  workflowExecutionId: string
): Promise<WorkflowExecutionDto> => {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let execution = await getExecution(apiClient, headers, workflowExecutionId);
  while (!isTerminalStatus(execution.status ?? '')) {
    if (Date.now() > deadline) {
      throw new Error(
        `Execution ${workflowExecutionId} did not terminate within ${POLL_TIMEOUT_MS}ms ` +
          `(last status: ${execution.status})`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    execution = await getExecution(apiClient, headers, workflowExecutionId);
  }
  return execution;
};
