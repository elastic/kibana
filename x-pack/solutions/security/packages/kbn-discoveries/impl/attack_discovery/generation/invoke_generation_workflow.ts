/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Stub: real implementation is added by a later PR in the stack. PR3 needs
// the *types* exported here so generation/types.ts can re-export them. The
// generation workflow itself is never invoked with the FF off (FF gates the
// discoveries plugin which owns this code path).

import type { Logger } from '@kbn/core/server';

import type { AnonymizedAlert, WorkflowsManagementApi } from './invoke_alert_retrieval_workflow';

export interface GenerationWorkflowResult {
  anonymizedAlerts: AnonymizedAlert[];
  attackDiscoveries: unknown[];
  replacements: Record<string, string>;
  workflowExecutionId: string;
  workflowId: string;
}

export interface InvokeGenerationWorkflowParams {
  anonymizedAlerts: AnonymizedAlert[];
  apiConfig: unknown;
  executionUuid: string;
  logger: Logger;
  replacements: Record<string, string>;
  request: unknown;
  spaceId: string;
  workflowId: string;
  workflowsManagementApi: WorkflowsManagementApi;
}
