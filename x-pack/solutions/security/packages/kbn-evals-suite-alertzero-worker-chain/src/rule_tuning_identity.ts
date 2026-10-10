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

/**
 * The review's `diagnose_rule` step resolves its model through the `alertzero_agentic`
 * inference feature. Read the connector it actually used from the step's own usage metadata,
 * so a result is never attributed to a model the review did not run on.
 */
export const assertReviewConnector = (
  execution: WorkflowExecutionDto,
  expectedConnectorId: string
): string => {
  const step = execution.stepExecutions?.find((s) => s.stepId === 'diagnose_rule');
  const usage = (step?.output as { metadata?: { usage?: { connectorId?: string } } } | undefined)
    ?.metadata?.usage;
  const actual = usage?.connectorId;
  if (actual !== expectedConnectorId) {
    throw new Error(
      `Rule Tuning diagnose_rule ran on connector ${actual ?? '(none reported)'}, ` +
        `not the candidate ${expectedConnectorId}`
    );
  }
  return actual;
};
