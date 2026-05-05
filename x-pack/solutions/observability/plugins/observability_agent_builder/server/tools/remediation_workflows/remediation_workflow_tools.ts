/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { executeWorkflow, type WorkflowExecutionResult } from '@kbn/agent-builder-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { RemediationWorkflowToolParams } from './remediation_workflow_schema';
import { mapRemediationParamsToWorkflowPayload } from './remediation_workflow_schema';

type WorkflowApi = WorkflowsServerPluginSetup['management'];

export interface ExecuteRemediationWorkflowParams {
  toolParams: RemediationWorkflowToolParams;
  workflowId: string;
  request: KibanaRequest;
  spaceId: string;
  workflowApi: WorkflowApi;
  waitForCompletion?: boolean;
  completionTimeoutSec?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Runs a resolved remediation workflow via Agent Builder's {@link executeWorkflow} (workflows-management API).
 */
export const executeRemediationWorkflow = async ({
  toolParams,
  workflowId,
  request,
  spaceId,
  workflowApi,
  waitForCompletion,
  completionTimeoutSec,
  metadata,
}: ExecuteRemediationWorkflowParams): Promise<WorkflowExecutionResult> => {
  return executeWorkflow({
    workflowId,
    workflowParams: mapRemediationParamsToWorkflowPayload(toolParams),
    request,
    spaceId,
    workflowApi,
    waitForCompletion,
    completionTimeoutSec,
    metadata,
  });
};
