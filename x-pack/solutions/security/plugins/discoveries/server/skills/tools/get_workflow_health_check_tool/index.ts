/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Stub: real implementation lands in PR8 (Skills). FF-off safe.

export interface WorkflowFetcher {
  fetch: (workflowId: string) => Promise<unknown | undefined>;
}

export const getWorkflowHealthCheckTool = (_deps: unknown): unknown => undefined;
