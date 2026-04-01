/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Placeholder — real implementation added in PR 4
import type { WorkflowExecutionDto } from '@kbn/workflows';

export interface CustomWorkflowAlertResult {
  alerts: string[];
  alertsContextCount: number;
  workflowId: string;
  workflowRunId: string;
}

export const extractCustomWorkflowResult = (_params: {
  execution: WorkflowExecutionDto;
  workflowId: string;
  workflowRunId: string;
}): CustomWorkflowAlertResult => {
  throw new Error('Not implemented — real implementation added in PR 4');
};
