/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { z, lazySchema } from '@kbn/zod';
import {
  ExecutionStatus,
  TerminalExecutionStatuses,
  type WorkflowExecutionDto,
  type WorkflowStepExecutionDto,
} from '@kbn/workflows';
import {
  PROPOSALS_API_VERSION,
  PROPOSALS_INTERNAL_URL,
  PROPOSAL_APPROVE_URL,
  PROPOSAL_DISMISS_URL,
  type ListProposalsResponse,
  type ProposalWithMetadata,
} from '@kbn/proposals-common';
import {
  AGENT_BUILDER_API_VERSION,
  DRAFT_STEP_ID,
  INVESTIGATION_TEMPLATE_ID,
  OUTPUT_STEP_ID,
  PROPOSE_STEP_ID,
  RULE_CREATION_WORKFLOW_ID,
  SCORING_INVESTIGATION_ID,
  WORKFLOWS_API_VERSION,
} from './constants';
import { draftRuleSchema, type DraftRule } from './types';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isTerminal = ({ status }: WorkflowExecutionDto) => TerminalExecutionStatuses.includes(status);

// propose_creation runs the proposal gate as a child workflow, so a run awaiting an analyst
// parks in WAITING_FOR_CHILD (non-terminal). preview_creation is a child workflow too, so the
// status alone does not mean the run reached the gate.
const isAtProposalGate = ({ status, stepExecutions }: WorkflowExecutionDto) =>
  status === ExecutionStatus.WAITING_FOR_CHILD &&
  (stepExecutions ?? []).some((s) => s.stepId === PROPOSE_STEP_ID);

const shouldStopPolling = (execution: WorkflowExecutionDto) =>
  isTerminal(execution) || isAtProposalGate(execution);

// The ai.agent step's persisted output is
// `{ message, structured_output: { rule, attachment_id, attachment_version }, metadata }` —
// the rule is NESTED under structured_output.rule (see the managed yaml templates:
// `steps.draft_creation.output.structured_output.rule.query`). Parsing structured_output
// as the rule itself strips the wrapper and yields an empty object — every evaluator
// then sees a rule with no fields (the false-zero failure this fixed).
const stepOutputSchema = lazySchema(() =>
  z
    .object({
      structured_output: z
        .object({
          rule: draftRuleSchema,
          // Why the agent built no rule; empty when it drafted one.
          reason: z.string(),
        })
        .partial(),
    })
    .partial()
);

// Each step produces two entries in stepExecutions: an "enter" record (output: null)
// and a "result" record (output: data). Find the result record for draft_creation.
//
// The quality gate refuses unwinnable gaps instead of drafting. The managed yaml has the agent
// signal a refusal with an empty name and query plus a `reason`, not a flag. A refusal is a
// CORRECT outcome, not a missing rule — evaluators must be able to tell the two apart (a crashed
// draft also yields no rule).
export const extractDraftFromSteps = (
  steps: WorkflowStepExecutionDto[]
): { rule: DraftRule | undefined; skipped: boolean; skipReason: string | undefined } => {
  const draftSteps = steps.filter((s) => s.stepId === DRAFT_STEP_ID);
  const resultRecord = draftSteps.find((s) => s.output != null);
  const parsed = stepOutputSchema.safeParse(resultRecord?.output);
  if (!parsed.success) return { rule: undefined, skipped: false, skipReason: undefined };
  const { rule, reason } = parsed.data.structured_output ?? {};
  if (rule && rule.name === '' && rule.query === '') {
    return { rule: undefined, skipped: true, skipReason: reason || undefined };
  }
  return { rule, skipped: false, skipReason: undefined };
};

const workflowOutputSchema = lazySchema(() =>
  z
    .object({
      created: z.boolean(),
      reviewed: z.boolean(),
      decision: z.string(),
      rule_name: z.string(),
      skip_reason: z.string(),
    })
    .partial()
);

export type RuleCreationWorkflowOutput = z.infer<typeof workflowOutputSchema>;

/** Reads the outputs the workflow's emit_result step reported, or undefined if it never ran. */
export const extractWorkflowOutput = (
  steps: WorkflowStepExecutionDto[]
): RuleCreationWorkflowOutput | undefined => {
  const resultRecord = steps.find((s) => s.stepId === OUTPUT_STEP_ID && s.output != null);
  const parsed = workflowOutputSchema.safeParse(resultRecord?.output);
  return parsed.success ? parsed.data : undefined;
};

export interface RuleCreationResult {
  rule: DraftRule | undefined;
  /** True when the v3 quality gate refused to draft (distinct from a failed draft). */
  skipped: boolean;
  /** Which gate the agent reported tripping, when it skipped. */
  skipReason: string | undefined;
  pendingApproval: boolean;
  traceId: string | undefined;
  workflowExecutionId: string;
  stepExecutions: WorkflowStepExecutionDto[];
}

export class RuleCreationClient {
  private readonly pendingExecutionIds: string[] = [];

  constructor(private readonly fetch: HttpHandler, private readonly log: ToolingLog) {}

  private async pollExecution({
    workflowExecutionId,
    isDone,
    maxWaitMs,
    pollIntervalMs,
  }: {
    workflowExecutionId: string;
    isDone: (execution: WorkflowExecutionDto) => boolean;
    maxWaitMs: number;
    pollIntervalMs: number;
  }): Promise<WorkflowExecutionDto> {
    const deadline = Date.now() + maxWaitMs;
    let execution: WorkflowExecutionDto | undefined;

    while (Date.now() < deadline) {
      execution = await this.fetch<WorkflowExecutionDto>(
        `/api/workflows/executions/${workflowExecutionId}`,
        {
          method: 'GET',
          version: WORKFLOWS_API_VERSION,
          headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
          query: { includeOutput: true },
        }
      );

      if (isDone(execution)) break;
      await sleep(pollIntervalMs);
    }

    if (!execution) {
      throw new Error(`No execution state returned while polling ${workflowExecutionId}`);
    }
    return execution;
  }

  async run({
    input,
    investigationId = SCORING_INVESTIGATION_ID,
    maxWaitMs = 10 * 60_000,
    pollIntervalMs = 5_000,
  }: {
    input: {
      technique: string;
      gap_description: string;
      evidence: string;
      confidence: number;
    };
    investigationId?: string;
    maxWaitMs?: number;
    pollIntervalMs?: number;
  }): Promise<RuleCreationResult> {
    const { workflowExecutionId } = await this.fetch<{ workflowExecutionId: string }>(
      `/api/workflows/workflow/${RULE_CREATION_WORKFLOW_ID}/run`,
      {
        method: 'POST',
        version: WORKFLOWS_API_VERSION,
        headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
        body: JSON.stringify({ inputs: { ...input, investigation_id: investigationId } }),
      }
    );

    this.log.info(`Started rule-creation workflow execution ${workflowExecutionId}`);
    this.pendingExecutionIds.push(workflowExecutionId);

    const execution = await this.pollExecution({
      workflowExecutionId,
      isDone: shouldStopPolling,
      maxWaitMs,
      pollIntervalMs,
    });

    if (!shouldStopPolling(execution)) {
      this.log.warning(
        `Workflow ${workflowExecutionId} neither finished nor reached the proposal gate within ${maxWaitMs}ms (last status: ${execution.status})`
      );
    }

    const { rule, skipped, skipReason } = extractDraftFromSteps(execution.stepExecutions ?? []);

    if (skipped) {
      this.log.info(
        `Workflow ${workflowExecutionId}: draft_creation declined the gap (${
          skipReason ?? 'no reason given'
        }) — the v3 quality gate held`
      );
    } else if (!rule) {
      this.log.warning(
        `Workflow ${workflowExecutionId} reached ${execution.status} but draft_creation produced no rule and did not decline — evaluators will score 0`
      );
    }

    const result: RuleCreationResult = {
      rule,
      skipped,
      skipReason,
      pendingApproval: isAtProposalGate(execution),
      traceId: execution.traceId,
      workflowExecutionId,
      stepExecutions: execution.stepExecutions ?? [],
    };
    return result;
  }

  /**
   * Opens an investigation for the workflow to record its proposal on, the same way the coverage
   * review does. Returns the investigation's conversation id.
   */
  async createInvestigation({ title }: { title: string }): Promise<string> {
    const { id } = await this.fetch<{ id: string }>('/api/agent_builder/conversations', {
      method: 'POST',
      headers: { 'elastic-api-version': AGENT_BUILDER_API_VERSION },
      body: JSON.stringify({
        title,
        template_id: INVESTIGATION_TEMPLATE_ID,
        access_control: { access_mode: 'public' },
      }),
    });
    this.log.info(`Created investigation ${id}`);
    return id;
  }

  async deleteInvestigation(investigationId: string): Promise<void> {
    await this.fetch(`/api/agent_builder/conversations/${encodeURIComponent(investigationId)}`, {
      method: 'DELETE',
      headers: { 'elastic-api-version': AGENT_BUILDER_API_VERSION },
    });
  }

  /**
   * Approves or dismisses the pending proposal on the investigation, then polls the rule-creation
   * execution until it finishes. Call this after run() returns pendingApproval:true.
   */
  async respond({
    workflowExecutionId,
    investigationId,
    approved,
    maxWaitMs = 5 * 60_000,
    pollIntervalMs = 5_000,
  }: {
    workflowExecutionId: string;
    investigationId: string;
    approved: boolean;
    maxWaitMs?: number;
    pollIntervalMs?: number;
  }): Promise<WorkflowExecutionDto> {
    const proposal = await this.waitForPendingProposal({
      investigationId,
      maxWaitMs,
      pollIntervalMs,
    });

    const { workflowExecutionId: gateExecutionId } = proposal;
    if (!gateExecutionId) {
      throw new Error(`Proposal ${proposal.id} carries no gate workflowExecutionId`);
    }

    // The decision routes refuse (409) until the gate execution has parked for input.
    const gate = await this.pollExecution({
      workflowExecutionId: gateExecutionId,
      isDone: (execution) =>
        execution.status === ExecutionStatus.WAITING_FOR_INPUT || isTerminal(execution),
      maxWaitMs,
      pollIntervalMs,
    });
    if (gate.status !== ExecutionStatus.WAITING_FOR_INPUT) {
      throw new Error(
        `Proposal gate ${gateExecutionId} for proposal ${proposal.id} is not waiting for a decision (status: ${gate.status})`
      );
    }

    this.log.info(`Sending ${approved ? 'approve' : 'dismiss'} for proposal ${proposal.id}`);
    const url = (approved ? PROPOSAL_APPROVE_URL : PROPOSAL_DISMISS_URL).replace(
      '{id}',
      encodeURIComponent(proposal.id)
    );
    await this.fetch(url, {
      method: 'POST',
      headers: { 'elastic-api-version': PROPOSALS_API_VERSION, 'kbn-xsrf': 'true' },
      body: JSON.stringify(approved ? {} : { dismissReason: 'no_reason' }),
    });

    // The decision is applied after the route returns, so wait for the run itself to finish.
    return this.pollExecution({
      workflowExecutionId,
      isDone: isTerminal,
      maxWaitMs,
      pollIntervalMs,
    });
  }

  private async waitForPendingProposal({
    investigationId,
    maxWaitMs,
    pollIntervalMs,
  }: {
    investigationId: string;
    maxWaitMs: number;
    pollIntervalMs: number;
  }): Promise<ProposalWithMetadata> {
    const deadline = Date.now() + maxWaitMs;
    while (Date.now() < deadline) {
      const { proposals } = await this.fetch<ListProposalsResponse>(PROPOSALS_INTERNAL_URL, {
        method: 'GET',
        headers: { 'elastic-api-version': PROPOSALS_API_VERSION },
        query: { conversationId: investigationId, status: 'pending', size: 1 },
      });
      if (proposals[0]) return proposals[0];
      await sleep(pollIntervalMs);
    }
    throw new Error(
      `No pending proposal appeared on investigation ${investigationId} within ${maxWaitMs}ms`
    );
  }

  async cancelPending(): Promise<void> {
    await Promise.allSettled(
      this.pendingExecutionIds.map((id) =>
        this.fetch(`/api/workflows/executions/${encodeURIComponent(id)}/cancel`, {
          method: 'POST',
          version: WORKFLOWS_API_VERSION,
          headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
        }).then(() => this.log.debug(`Cancelled workflow execution ${id}`))
      )
    );
    this.pendingExecutionIds.length = 0;
  }
}
