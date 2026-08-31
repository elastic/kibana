/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type {
  WorkflowDetailDto,
  WorkflowExecutionDto,
  WorkflowExecutionEngineModel,
} from '@kbn/workflows';

export const FP_TP_ANALYSIS_TRIGGERED_BY = 'pnd-fp-tp-analysis';

export const FP_TP_ERROR_CODE = {
  malformedModelOutput: 'malformed_model_output',
  unknownSchemaVersion: 'unknown_schema_version',
  workflowFailed: 'workflow_failed',
  workflowMissing: 'workflow_missing',
  workflowOutputMissing: 'workflow_output_missing',
  timeout: 'timeout',
} as const;

/**
 * Structural subset of WorkflowsManagementApi used to invoke the FP/TP workflow.
 */
export interface FpTpWorkflowsManagementApi {
  getWorkflow: (workflowId: string, spaceId: string) => Promise<WorkflowDetailDto | null>;
  getWorkflowExecution: (
    executionId: string,
    spaceId: string,
    options?: { includeInput?: boolean; includeOutput?: boolean }
  ) => Promise<WorkflowExecutionDto | null>;
  scheduleWorkflow: (
    workflow: WorkflowExecutionEngineModel,
    spaceId: string,
    inputs: Record<string, unknown>,
    request: KibanaRequest,
    triggeredBy: string
  ) => Promise<string>;
}
