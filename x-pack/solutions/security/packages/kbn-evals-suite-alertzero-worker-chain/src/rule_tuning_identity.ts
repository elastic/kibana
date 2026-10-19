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
 * A step with a timeout is recorded twice: a `step_level_timeout` wrapper (no output) followed by
 * the step's own execution. Skip the wrapper, or its empty output reads as "no connector".
 */
const findStepExecution = (execution: WorkflowExecutionDto, stepId: string) => {
  const matches = (execution.stepExecutions ?? []).filter((s) => s.stepId === stepId);
  return matches.find((s) => s.stepType !== 'step_level_timeout') ?? matches[matches.length - 1];
};

const stepErrorMessage = (error: unknown): string | undefined => {
  if (error === undefined || error === null) return undefined;
  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' ? message : JSON.stringify(error);
};

/**
 * Name the layer a review stopped at when `diagnose_rule` reported no connector. The step
 * only reports one after an LLM round and is gated on `fetch_rule`, so the status of both
 * steps (and the fetched rule's `enabled` flag) says whether the rule fetch, the gate, or
 * the model call is what failed.
 */
export const describeReviewDiagnosis = (execution: WorkflowExecutionDto): string => {
  const diagnose = findStepExecution(execution, 'diagnose_rule');
  const fetchRule = findStepExecution(execution, 'fetch_rule');
  const describe = (name: string, step: typeof diagnose): string => {
    if (!step) return `${name}: no step execution`;
    const error = stepErrorMessage(step.error);
    return `${name}: ${step.status}${error ? ` (error: ${error})` : ''}`;
  };
  const enabled = (fetchRule?.output as { enabled?: unknown } | undefined)?.enabled;
  return [
    describe('diagnose_rule', diagnose),
    describe('fetch_rule', fetchRule),
    `fetch_rule.output.enabled: ${enabled === undefined ? '(absent)' : String(enabled)}`,
    `review: ${execution.status}`,
  ].join('; ');
};

/**
 * The review's `diagnose_rule` step resolves its model through the `alertzero_agentic`
 * inference feature. Read the connector it actually used from the step's own usage metadata,
 * so a result is never attributed to a model the review did not run on. A step that reports
 * no connector made no model call, so that failure names the step statuses instead of just
 * the gap.
 */
export const assertReviewConnector = (
  execution: WorkflowExecutionDto,
  expectedConnectorId: string
): string => {
  const step = findStepExecution(execution, 'diagnose_rule');
  const usage = (step?.output as { metadata?: { usage?: { connectorId?: string } } } | undefined)
    ?.metadata?.usage;
  const actual = usage?.connectorId;
  if (actual === undefined) {
    throw new Error(
      `Rule Tuning diagnose_rule ran on connector (none reported), not the candidate ` +
        `${expectedConnectorId}; it made no model call [${describeReviewDiagnosis(execution)}]`
    );
  }
  if (actual !== expectedConnectorId) {
    throw new Error(
      `Rule Tuning diagnose_rule ran on connector ${actual}, not the candidate ${expectedConnectorId}`
    );
  }
  return actual;
};
