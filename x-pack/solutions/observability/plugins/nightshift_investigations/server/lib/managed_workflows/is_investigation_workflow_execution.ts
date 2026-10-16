/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID,
  NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
} from '@kbn/workflows/managed';

export const isInvestigationWorkflowExecution = ({
  workflowId,
  originManagedWorkflowId,
}: {
  workflowId?: string | null;
  originManagedWorkflowId?: string | null;
}): boolean =>
  workflowId === NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID ||
  originManagedWorkflowId === NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID ||
  // Per-space copies bound to a service account carry a space suffix on their workflow id.
  originManagedWorkflowId === NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID;

/** A run of a space's bound entry point, which starts the global investigation as its child. */
export const isInvestigationEntryPointExecution = ({
  originManagedWorkflowId,
}: {
  originManagedWorkflowId?: string | null;
}): boolean => originManagedWorkflowId === NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID;
