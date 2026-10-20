/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ok } from './kbn';
import type { AlertZeroApi } from './kbn';
import { waitForExecution } from './alertzero';
import type { WorkflowExecution } from './alertzero';

/**
 * Inlined instead of imported from `@kbn/workflows/managed`: Playwright cannot load the
 * managed-workflow YAML that barrel pulls in.
 */
export const COVERAGE_SWEEP_WORKFLOW_ID = 'system-security-coverage-worker';

/** Outputs the sweep declares, with the JSON type the engine validates each one against. */
export const COVERAGE_SWEEP_OUTPUT_TYPES = {
  pending: 'number',
  started: 'number',
  in_flight: 'number',
  search_failed: 'boolean',
  lookup_failed: 'boolean',
} as const;

interface ExecutionWithOutput extends WorkflowExecution {
  context?: { inputs?: Record<string, unknown>; output?: Record<string, unknown> };
}

/**
 * Starts a workflow through the public run route as the admin user and waits for a terminal
 * status. Used instead of the per-space worker when a specific input must reach the workflow,
 * because the worker only forwards the inputs its own definition lists.
 */
export const runWorkflow = async (
  api: AlertZeroApi,
  workflowId: string,
  inputs: Record<string, unknown>,
  { timeoutMs }: { timeoutMs: number }
): Promise<WorkflowExecution> => {
  const { workflowExecutionId } = ok(
    await api.public<{ workflowExecutionId: string }>(
      'POST',
      `/api/workflows/workflow/${encodeURIComponent(workflowId)}/run`,
      { body: { inputs } }
    ),
    `run workflow ${workflowId}`
  );
  return waitForExecution(api, `workflow ${workflowId} execution`, workflowExecutionId, {
    timeoutMs,
  });
};

/**
 * The values the execution's final `workflow.output` step emitted. The engine validates them
 * against the workflow's declared `outputs`, so their JSON types are the declared ones.
 */
export const readExecutionOutput = async (
  api: AlertZeroApi,
  executionId: string
): Promise<Record<string, unknown>> =>
  ok(
    await api.public<ExecutionWithOutput>(
      'GET',
      `/api/workflows/executions/${encodeURIComponent(executionId)}?includeOutput=true`
    ),
    `read the output of execution ${executionId}`
  ).context?.output ?? {};
