/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';

export const isInvestigationWorkflowExecution = ({
  workflowId,
  originManagedWorkflowId,
}: {
  workflowId?: string | null;
  originManagedWorkflowId?: string | null;
}): boolean =>
  workflowId === NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID ||
  originManagedWorkflowId === NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID;
