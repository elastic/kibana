/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Stub: real implementation is added by a later PR in the stack. PR3 needs
// the *types* exported here so generation/types.ts can re-export them. The
// validation workflow itself is never invoked with the FF off.

import type { Logger } from '@kbn/core/server';

import type { WorkflowsManagementApi } from './invoke_alert_retrieval_workflow';

export interface ValidationResult {
  invalidDiscoveries: unknown[];
  validDiscoveries: unknown[];
  workflowExecutionId: string;
  workflowId: string;
}

export interface InvokeValidationParams {
  attackDiscoveries: unknown[];
  executionUuid: string;
  logger: Logger;
  request: unknown;
  spaceId: string;
  workflowId: string;
  workflowsManagementApi: WorkflowsManagementApi;
}
