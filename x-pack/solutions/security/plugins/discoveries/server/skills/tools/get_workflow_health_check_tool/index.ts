/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Stub: real implementation lands in PR8 (Skills). FF-off safe.

// Shape kept permissive (`unknown`) so PR3 can pass `workflowsManagementApi`
// directly; PR8's real impl refines to the precise API surface used.
export type WorkflowFetcher = unknown;

export const getWorkflowHealthCheckTool = (_deps: unknown): unknown => undefined;
