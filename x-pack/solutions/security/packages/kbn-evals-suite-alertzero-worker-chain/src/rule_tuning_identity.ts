/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';

/** Check the engine's effective principal, not the operator who dispatched the run. */
export const assertRuleTuningIdentity = (
  execution: WorkflowExecutionDto,
  serviceAccountId: string
): string => {
  const identity = execution.effectiveIdentity;
  if (identity?.type !== 'service_account' || identity.id !== serviceAccountId) {
    throw new Error('Rule Tuning review did not execute as its worker service account');
  }
  return identity.id;
};
