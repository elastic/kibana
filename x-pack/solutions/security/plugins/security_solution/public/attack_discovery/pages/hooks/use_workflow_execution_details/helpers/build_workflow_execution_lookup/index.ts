/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  WorkflowExecutionReference,
  WorkflowExecutionsTracking,
} from '@kbn/elastic-assistant-common';

export const buildWorkflowExecutionLookup = (
  workflowExecutions: WorkflowExecutionsTracking | null | undefined
): Map<string, string> => {
  const workflowExecutionLookup = new Map<string, string>();

  const addExecution = (execution: WorkflowExecutionReference | null | undefined) => {
    if (!execution) {
      return;
    }

    workflowExecutionLookup.set(execution.workflowRunId, execution.workflowId);
  };

  const alertRetrievalRefs = workflowExecutions?.alertRetrieval;
  if (Array.isArray(alertRetrievalRefs)) {
    for (const ref of alertRetrievalRefs) {
      addExecution(ref);
    }
  }

  addExecution(workflowExecutions?.generation);
  addExecution(workflowExecutions?.validation);

  return workflowExecutionLookup;
};
