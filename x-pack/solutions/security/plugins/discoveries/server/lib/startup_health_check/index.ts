/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

// PR3 callers pass `{ expectedWorkflowIds, failedWorkflowIds, logger,
// workflowsManagementApiAvailable }`; older callers passed the
// `failedStepIds`/`registeredStepCount` shape. Both are accepted here so the
// stub satisfies PR2 + PR3 simultaneously; the real impl (PR4) refines the
// signature.
export interface StartupHealthCheckParams {
  expectedWorkflowIds?: readonly string[];
  failedStepIds?: string[];
  failedWorkflowIds?: string[];
  logger: Logger;
  registeredStepCount?: number;
  workflowsManagementApiAvailable: boolean;
}

// Placeholder — real implementation added in PR 4
export const logStartupHealthCheck = (_params: StartupHealthCheckParams): void => {};
