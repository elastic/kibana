/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListProposalsResponse } from '@kbn/proposals-common';
import { PROPOSAL_TIMEOUT_MS, PROPOSALS_URL } from './constants';
import { ok } from './kbn';
import type { AlertZeroApi } from './kbn';
import { describeExecution, waitForExecutionStatus } from './alertzero';
import type { WorkflowExecution } from './alertzero';

/**
 * Flow 4 (rule tuning) helpers. Ids are inlined instead of imported from `@kbn/workflows/managed`
 * / `@kbn/alertzero-common`: Playwright cannot load the managed-workflow YAML those barrels pull in.
 */
export const RULE_TUNING_WORKER_ID = 'system-security-detection-rule-tuning';
export const RULE_TUNING_REVIEW_WORKFLOW_ID = 'system-security-rule-tuning-review';
export const ADD_RULE_EXCEPTION_ACTION_ID = 'system-alertzero-action-add-rule-exception';
export const EDIT_RULE_ACTION_ID = 'system-alertzero-action-edit-rule';

/**
 * A pending proposal as the tuning flow reads it. Distinct from the `PendingProposal` of
 * `alertzero.ts`: the tuning flow matches on the proposal's rendered `comment`.
 */
export interface TuningProposal {
  readonly id: string;
  readonly conversationId: string;
  readonly title: string;
  readonly comment: string;
  readonly actionWorkflowId?: string;
  readonly actionInput?: Record<string, unknown>;
  readonly workflowExecutionId?: string;
  readonly createdAt: string;
}

export const listTuningProposals = async (api: AlertZeroApi): Promise<TuningProposal[]> =>
  ok(
    await api.internal<ListProposalsResponse>('GET', PROPOSALS_URL, {
      query: { origin: 'alertzero', status: 'pending', excludeSuperseded: true, size: 100 },
    }),
    'list pending proposals'
  ).proposals as TuningProposal[];

/** The rule a proposal's action points at, by either id field the flows write. */
export const actionTarget = (input: Record<string, unknown> | undefined): unknown =>
  input?.rule_id ?? input?.id;

/**
 * Dismisses the tuning proposals this run left pending: the review-gate entry proposal and the
 * tuning proposal itself, tied to the run by the rules it seeded (the entry proposal names the
 * rule, the tuning proposal targets it). Dismissal — not approval — releases the parked review
 * behind it on its declined branch, so it must run while the service account the review executes
 * as still exists. A 409 means the proposal was decided concurrently (its spec approved or
 * dismissed it, or a teardown cancel already ended its run), which teardown accepts.
 *
 * Returns the conversation ids behind every run-tied proposal it saw, decided or not, so the
 * caller can delete the Investigations those conversations are: they persist after the proposals
 * are gone and point at rules the teardown deletes next.
 */
export const dismissRunTuningProposals = async (
  api: AlertZeroApi,
  rules: ReadonlyArray<{ ruleId: string; runMarker: string }>
): Promise<string[]> => {
  const dismissedConversations: string[] = [];
  for (const proposal of await listTuningProposals(api)) {
    const fromThisRun = rules.some(
      (rule) =>
        actionTarget(proposal.actionInput) === rule.ruleId ||
        proposal.comment.includes(rule.runMarker)
    );
    if (fromThisRun) {
      // Record the conversation before the dismiss: a 409 leaves the proposal decided but its
      // Investigation still needs deleting, and the dismiss response does not carry the id.
      dismissedConversations.push(proposal.conversationId);
      const response = await api.internal(
        'POST',
        `${PROPOSALS_URL}/${encodeURIComponent(proposal.id)}/dismiss`,
        {
          body: {
            dismissReason: 'handled_elsewhere',
            rationale: 'AlertZero rule-tuning e2e teardown',
          },
        }
      );
      // `api.internal` resolves non-2xx responses as values; only a concurrent decision is
      // acceptable.
      if (response.statusCode >= 300 && response.statusCode !== 409) {
        throw new Error(
          `dismiss proposal ${proposal.id} failed: ${response.statusCode} ${JSON.stringify(
            response.body
          )}`
        );
      }
    }
  }
  return dismissedConversations;
};

/**
 * Approves a proposal exactly as the approval modal does, but only once the execution backing it
 * has parked in `waiting_for_input`. The route answers 409 earlier; retrying the 409 blindly would
 * green the test without the run actually waiting for the human.
 */
export const approveTuningProposal = async (
  api: AlertZeroApi,
  proposal: TuningProposal
): Promise<void> => {
  if (proposal.workflowExecutionId) {
    await waitForExecutionStatus(
      api,
      `the execution behind proposal ${proposal.id} to wait for input`,
      proposal.workflowExecutionId,
      'waiting_for_input',
      { timeoutMs: PROPOSAL_TIMEOUT_MS }
    );
  }
  ok(
    await api.internal('POST', `${PROPOSALS_URL}/${encodeURIComponent(proposal.id)}/approve`, {
      body: { actionInput: proposal.actionInput },
    }),
    `approve proposal ${proposal.id}`
  );
};

/** Dismisses a proposal once the execution behind it is parked, so the queue does not keep it. */
export const dismissTuningProposal = async (
  api: AlertZeroApi,
  proposal: TuningProposal
): Promise<void> => {
  if (proposal.workflowExecutionId) {
    await waitForExecutionStatus(
      api,
      `the execution behind proposal ${proposal.id} to wait for input`,
      proposal.workflowExecutionId,
      'waiting_for_input',
      { timeoutMs: PROPOSAL_TIMEOUT_MS }
    );
  }
  ok(
    await api.internal('POST', `${PROPOSALS_URL}/${encodeURIComponent(proposal.id)}/dismiss`, {
      body: { dismissReason: 'no_reason' },
    }),
    `dismiss proposal ${proposal.id}`
  );
};

type StepList = WorkflowExecution['stepExecutions'];

/**
 * Re-throws a failed wait with what the stack was actually holding: every pending proposal's
 * action and title, plus the per-step breakdown of the execution that should have raised it. A
 * proposal that never matches then names the one that did arrive instead of just timing out.
 */
export const explainMissingTuningProposal = async (
  api: AlertZeroApi,
  error: unknown,
  executionId: string
): Promise<never> => {
  const pending = await listTuningProposals(api).catch(() => [] as TuningProposal[]);
  const held = pending
    .map((proposal) => `  ${proposal.actionWorkflowId ?? 'no action'}: ${proposal.title}`)
    .join('\n');
  const unfinished = (steps: StepList, prefix: string) =>
    (steps ?? [])
      .filter((step) => step.status !== 'completed' && step.status !== 'skipped')
      .map((step) => `${prefix}${step.stepId}=${step.status}`);
  const stalled = await Promise.all([
    api
      .public<WorkflowExecution>('GET', `/api/workflows/executions/${executionId}`)
      .then((response) => unfinished(ok(response, 'read the execution').stepExecutions, '')),
    api
      .public<Array<{ workflowId: string; stepExecutions: StepList }>>(
        'GET',
        `/api/workflows/executions/${executionId}/children`
      )
      .then((response) =>
        ok(response, 'read the child executions').flatMap((child) =>
          unfinished(child.stepExecutions, `${child.workflowId}:`)
        )
      ),
  ])
    .then((groups) => groups.flat().join(','))
    .catch(() => 'unreadable');
  throw new Error(
    `${(error as Error).message}\n[stalled steps: ${stalled || 'none'}]\npending proposals:\n${
      held || '  none'
    }\n${await describeExecution(api, executionId)}`
  );
};
