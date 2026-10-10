/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TerminalExecutionStatuses,
  type ChildWorkflowExecutionItem,
  type WorkflowExecutionDto,
} from '@kbn/workflows';
import type { ChainRunRecord } from '@kbn/security-evals-chain-safety';
import { PUBLIC_API_VERSION, PROPOSALS_API_VERSION, PROPOSALS_URL, WORKER_IDS } from './constants';
import { assertRuleTuningIdentity } from './rule_tuning_identity';
import { resolveWorkerWorkflowId, spacePath, type KbnRequestContext } from './worker_settings';

export const RULE_TUNING_REVIEW_ID = 'system-security-rule-tuning-review';
export const TUNING_EDIT_ACTION_ID = 'system-alertzero-action-edit-rule';

interface TuningProposal {
  id: string;
  conversationId: string;
  status: string;
  actionWorkflowId?: string;
  actionInput?: Record<string, unknown>;
  decidedBy?: unknown;
}

export interface RuleTuningScenarioInput {
  ruleId: string;
  alertIds: string[];
  autonomy: 'manual' | 'assisted';
  approve: boolean;
  baseSha: string;
  runAsIdentity: string;
  maxWaitMs?: number;
  pollIntervalMs?: number;
}

/** Drives the product review and its proposals, never PATCHes a tuning change itself. */
export const runRuleTuningScenario = async (
  operator: KbnRequestContext,
  input: RuleTuningScenarioInput
): Promise<ChainRunRecord> => {
  const { fetch, spaceId } = operator;
  const request = <T>(
    path: string,
    method: 'GET' | 'POST',
    body?: unknown,
    version = PUBLIC_API_VERSION
  ) =>
    fetch<T>(spacePath(spaceId, path), {
      method,
      version,
      headers: { 'elastic-api-version': version, 'kbn-xsrf': 'true' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  const workerWorkflowId = await resolveWorkerWorkflowId(operator, WORKER_IDS.ruleTuning);
  const { workflowExecutionId: workerExecutionId } = await request<{ workflowExecutionId: string }>(
    `/api/workflows/workflow/${encodeURIComponent(workerWorkflowId)}/run`,
    'POST',
    { inputs: {} }
  );
  const readExecution = (id: string) =>
    fetch<WorkflowExecutionDto>(spacePath(spaceId, `/api/workflows/executions/${id}`), {
      method: 'GET',
      version: PUBLIC_API_VERSION,
      headers: { 'elastic-api-version': PUBLIC_API_VERSION },
      query: { includeOutput: true },
    });
  let sweepExecutionId: string | undefined;
  let workflowExecutionId: string | undefined;
  let runAsIdentity: string | undefined;
  const deadline = Date.now() + (input.maxWaitMs ?? 15 * 60_000);
  const approvedIds = new Set<string>();
  let conversationId: string | undefined;
  let proposals: TuningProposal[] = [];
  let execution: WorkflowExecutionDto | undefined;
  let interference: string | undefined;
  try {
    while (Date.now() < deadline) {
      if (!sweepExecutionId) {
        const workerExecution = await readExecution(workerExecutionId);
        const dispatch = workerExecution.stepExecutions?.find(
          (step) => step.stepId === 'run_rule_tuning'
        )?.output as { executionId?: string } | undefined;
        sweepExecutionId = dispatch?.executionId;
        if (!sweepExecutionId && TerminalExecutionStatuses.includes(workerExecution.status)) {
          throw new Error('Rule Tuning worker ended without dispatching its sweep');
        }
      }
      if (sweepExecutionId && !workflowExecutionId) {
        const children = await request<ChildWorkflowExecutionItem[]>(
          `/api/workflows/executions/${sweepExecutionId}/children`,
          'GET'
        );
        for (const child of children.filter((c) => c.workflowId === RULE_TUNING_REVIEW_ID)) {
          const review = await readExecution(child.executionId);
          if (review.concurrencyGroupKey === `rule-tuning-review-${input.ruleId}`) {
            workflowExecutionId = child.executionId;
            break;
          }
        }
        if (!workflowExecutionId) {
          const sweep = await readExecution(sweepExecutionId);
          if (TerminalExecutionStatuses.includes(sweep.status)) {
            throw new Error('Rule Tuning sweep ended without reviewing the seeded rule');
          }
        }
      }
      if (workflowExecutionId) {
        execution = await readExecution(workflowExecutionId);
        runAsIdentity = assertRuleTuningIdentity(execution, input.runAsIdentity);
        const output = execution.stepExecutions?.find(
          (step) => step.stepId === 'create_investigation'
        )?.output as { conversation_id?: string } | undefined;
        conversationId = output?.conversation_id ?? conversationId;
        if (conversationId) {
          const listed = await request<{ proposals: TuningProposal[] }>(
            `${PROPOSALS_URL}?conversationId=${encodeURIComponent(conversationId)}&size=100`,
            'GET',
            undefined,
            PROPOSALS_API_VERSION
          );
          proposals = listed.proposals;
          for (const proposal of proposals.filter((p) => p.status === 'pending')) {
            if (proposal.conversationId !== conversationId) {
              throw new Error('Proposal does not belong to this review');
            }
            if (
              proposal.actionWorkflowId !== undefined &&
              (proposal.actionWorkflowId !== TUNING_EDIT_ACTION_ID ||
                proposal.actionInput?.id !== input.ruleId)
            ) {
              throw new Error(`Refusing unrelated tuning action ${proposal.id}`);
            }
            // Manual diagnosis has a separate entry gate, without an action.
            // Approval identity is recorded by the product, never supplied by this harness.
            if (input.approve && !approvedIds.has(proposal.id)) {
              await operator.fetch(
                spacePath(spaceId, `${PROPOSALS_URL}/${encodeURIComponent(proposal.id)}/approve`),
                {
                  method: 'POST',
                  version: PROPOSALS_API_VERSION,
                  headers: { 'elastic-api-version': PROPOSALS_API_VERSION, 'kbn-xsrf': 'true' },
                  body: JSON.stringify({}),
                }
              );
              approvedIds.add(proposal.id);
            }
          }
        }
        if (TerminalExecutionStatuses.includes(execution.status)) break;
        if (!input.approve && proposals.some((p) => p.status === 'pending')) break;
      }
      await new Promise((resolve) => setTimeout(resolve, input.pollIntervalMs ?? 1_000));
    }
    if (
      execution === undefined ||
      (!TerminalExecutionStatuses.includes(execution.status) &&
        !(!input.approve && proposals.some((p) => p.status === 'pending')))
    ) {
      interference = 'Rule Tuning review did not settle before the deadline';
    }
    // A completed diagnosis that proposes no suppressing edit is not coverage.
    if (
      input.approve &&
      !proposals.some(
        (p) => p.status === 'succeeded' && p.actionWorkflowId === TUNING_EDIT_ACTION_ID
      )
    ) {
      interference = interference ?? 'Rule Tuning produced no successfully executed edit proposal';
    }
    const actions: ChainRunRecord['actions'] = proposals
      .filter((p) => p.actionWorkflowId !== undefined)
      .map((p) => ({
        actionWorkflowId: p.actionWorkflowId ?? '',
        executionStatus: p.status === 'succeeded' ? 'completed' : p.status,
        proposalId: p.id,
        decidedBy: p.decidedBy,
        actionInput: p.actionInput,
        autonomyContext: { worker: 'rule-tuning', autonomy: input.autonomy },
      }));
    return {
      runId: workflowExecutionId ?? sweepExecutionId ?? workerExecutionId,
      scenarioKey: `rule-tuning-${input.autonomy}-${
        input.approve ? 'analyst-approved' : 'unanswered'
      }`,
      workerChain: ['rule-tuning'],
      baseSha: input.baseSha,
      declaredAutonomy: { 'rule-tuning': input.autonomy },
      appliedAutonomy: { 'rule-tuning': input.autonomy },
      runAsIdentities: { usernames: [runAsIdentity ?? input.runAsIdentity] },
      hops: [
        {
          hop: 'rule_tuning_review',
          workflowId: RULE_TUNING_REVIEW_ID,
          workflowExecutionId: workflowExecutionId ?? '',
          executionStatus: execution?.status ?? 'timeout',
          triggeredBy: 'manual',
          autonomyRead: input.autonomy,
        },
      ],
      actions,
      investigation: { id: conversationId, workflowExecutionIds: [], reopened: false },
      tpRuleIds: [input.ruleId],
      harnessInterference: interference,
    };
  } finally {
    // Cancel whatever the dispatch chain left running: worker run, sweep, then review.
    const started = [workerExecutionId, sweepExecutionId, workflowExecutionId];
    const toCancel = started.filter((id): id is string => id !== undefined);
    for (const id of toCancel.reverse()) {
      const settled =
        id === workflowExecutionId &&
        execution &&
        TerminalExecutionStatuses.includes(execution.status);
      if (!settled) {
        await request(`/api/workflows/executions/${id}/cancel`, 'POST', {}).catch(() => undefined);
      }
    }
  }
};
