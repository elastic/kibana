/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { z } from '@kbn/zod';
import {
  type ExecutionStatus,
  TerminalExecutionStatuses,
  type WorkflowExecutionDto,
  type WorkflowStepExecutionDto,
} from '@kbn/workflows';
import {
  PROPOSALS_API_VERSION,
  PROPOSALS_INTERNAL_URL,
  PROPOSAL_APPROVE_URL,
  PROPOSAL_DISMISS_URL,
} from '@kbn/proposals-common';
import { DRAFT_STEP_ID, RULE_CREATION_WORKFLOW_ID, WORKFLOWS_API_VERSION } from './constants';
import { createInvestigation, deleteInvestigation } from './investigation';
import { draftRuleSchema, type DraftRule } from './types';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isTerminal = (status: ExecutionStatus) => TerminalExecutionStatuses.includes(status);

const PROPOSALS_HEADERS = {
  'elastic-api-version': PROPOSALS_API_VERSION,
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'kibana',
};

const proposalUrl = (template: string, id: string) =>
  template.replace('{id}', encodeURIComponent(id));

// The ai.agent step's persisted output is
// `{ message, structured_output: { rule, attachment_id, attachment_version }, metadata }` —
// the rule is NESTED under structured_output.rule (see the managed yaml templates:
// `steps.draft_creation.output.structured_output.rule.query`). Parsing structured_output
// as the rule itself strips the wrapper and yields an empty object — every evaluator
// then sees a rule with no fields (the false-zero failure this fixed).
const stepOutputSchema = z
  .object({
    structured_output: z
      .object({
        rule: draftRuleSchema,
        // v3 quality gate: the agent refuses unwinnable gaps instead of drafting.
        // A refusal is a CORRECT outcome, not a missing rule — evaluators must be
        // able to tell the two apart (a crashed draft also yields no rule).
        skipped: z.boolean(),
        reason: z.string(),
      })
      .partial(),
  })
  .partial();

// Each step produces two entries in stepExecutions: an "enter" record (output: null)
// and a "result" record (output: data). Find the result record for draft_creation.
const extractDraftFromSteps = (
  steps: WorkflowStepExecutionDto[]
): { rule: DraftRule | undefined; skipped: boolean; skipReason: string | undefined } => {
  const draftSteps = steps.filter((s) => s.stepId === DRAFT_STEP_ID);
  const resultRecord = draftSteps.find((s) => s.output != null);
  const parsed = stepOutputSchema.safeParse(resultRecord?.output);
  if (!parsed.success) return { rule: undefined, skipped: false, skipReason: undefined };
  const out = parsed.data.structured_output;
  return {
    rule: out?.rule,
    skipped: out?.skipped === true,
    skipReason: out?.reason,
  };
};

export interface RuleCreationResult {
  rule: DraftRule | undefined;
  /** True when the quality gate refused to draft (distinct from a failed draft). */
  skipped: boolean;
  /** Which gate the agent reported tripping, when it skipped. */
  skipReason: string | undefined;
  /** True when the draft reached the proposal gate and an analyst decision is awaited. */
  pendingApproval: boolean;
  /** Investigation (conversation) the workflow recorded its proposal on. */
  investigationId: string;
  /** The pending proposal, when pendingApproval. */
  proposalId: string | undefined;
  traceId: string | undefined;
  workflowExecutionId: string;
  stepExecutions: WorkflowStepExecutionDto[];
}

export class RuleCreationClient {
  private readonly pendingExecutionIds: string[] = [];
  private readonly investigationIds: string[] = [];

  constructor(private readonly fetch: HttpHandler, private readonly log: ToolingLog) {}

  private async pollExecution({
    workflowExecutionId,
    isDone,
    maxWaitMs,
    pollIntervalMs,
    onTick,
  }: {
    workflowExecutionId: string;
    isDone: (status: ExecutionStatus) => boolean;
    maxWaitMs: number;
    pollIntervalMs: number;
    /** Runs after each poll while the execution is not done; returning true stops polling. */
    onTick?: () => Promise<boolean>;
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

      if (isDone(execution.status)) break;
      if (onTick && (await onTick())) break;
      await sleep(pollIntervalMs);
    }

    if (!execution) {
      throw new Error(`No execution state returned while polling ${workflowExecutionId}`);
    }
    return execution;
  }

  /**
   * The proposal the workflow's `propose_creation` step parked on the investigation, if any.
   * The gate parks the run in WAITING_FOR_CHILD, so the execution status alone cannot tell
   * "waiting on an analyst" from "waiting on any other child".
   */
  private async findPendingProposalId(investigationId: string): Promise<string | undefined> {
    const { proposals } = await this.fetch<{ proposals: Array<{ id: string }> }>(
      PROPOSALS_INTERNAL_URL,
      {
        method: 'GET',
        version: PROPOSALS_API_VERSION,
        headers: PROPOSALS_HEADERS,
        query: { conversationId: investigationId, status: 'pending', origin: 'alertzero' },
      }
    );
    return proposals[0]?.id;
  }

  async run({
    input,
    maxWaitMs = 10 * 60_000,
    pollIntervalMs = 5_000,
  }: {
    input: {
      technique: string;
      gap_description: string;
      evidence: string;
      confidence: number;
    };
    maxWaitMs?: number;
    pollIntervalMs?: number;
  }): Promise<RuleCreationResult> {
    // The workflow records its proposal on a caller-supplied investigation (required input).
    const investigationId = await createInvestigation(this.fetch, 'Rule creation eval');
    this.investigationIds.push(investigationId);

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

    // Stop at a terminal status, or as soon as the draft is parked at the proposal gate.
    let proposalId: string | undefined;
    const execution = await this.pollExecution({
      workflowExecutionId,
      isDone: isTerminal,
      maxWaitMs,
      pollIntervalMs,
      onTick: async () => {
        proposalId = await this.findPendingProposalId(investigationId);
        return proposalId !== undefined;
      },
    });

    if (!isTerminal(execution.status) && proposalId === undefined) {
      this.log.warning(
        `Workflow ${workflowExecutionId} did not reach a terminal state or the proposal gate within ${maxWaitMs}ms (last status: ${execution.status})`
      );
    }

    const { rule, skipped, skipReason } = extractDraftFromSteps(execution.stepExecutions ?? []);

    if (skipped) {
      this.log.info(
        `Workflow ${workflowExecutionId}: draft_creation declined the gap (${
          skipReason ?? 'no reason given'
        }) — the quality gate held`
      );
    } else if (!rule) {
      this.log.warning(
        `Workflow ${workflowExecutionId} reached ${execution.status} but draft_creation produced no rule and did not decline — evaluators will score 0`
      );
    }

    return {
      rule,
      skipped,
      skipReason,
      pendingApproval: proposalId !== undefined,
      investigationId,
      proposalId,
      traceId: execution.traceId,
      workflowExecutionId,
      stepExecutions: execution.stepExecutions ?? [],
    };
  }

  /**
   * Decides the proposal the workflow parked at `propose_creation`, then polls until the run
   * reaches a terminal state. Call this after run() returns pendingApproval:true.
   */
  async respond({
    workflowExecutionId,
    proposalId,
    approved,
    maxWaitMs = 5 * 60_000,
    pollIntervalMs = 5_000,
  }: {
    workflowExecutionId: string;
    proposalId: string;
    approved: boolean;
    maxWaitMs?: number;
    pollIntervalMs?: number;
  }): Promise<WorkflowExecutionDto> {
    this.log.info(`Sending approved=${approved} for proposal ${proposalId}`);
    await this.fetch(
      proposalUrl(approved ? PROPOSAL_APPROVE_URL : PROPOSAL_DISMISS_URL, proposalId),
      {
        method: 'POST',
        version: PROPOSALS_API_VERSION,
        headers: PROPOSALS_HEADERS,
        body: JSON.stringify(approved ? {} : { dismissReason: 'no_reason' }),
      }
    );

    return this.pollExecution({
      workflowExecutionId,
      isDone: isTerminal,
      maxWaitMs,
      pollIntervalMs,
    });
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

    await Promise.allSettled(
      this.investigationIds.map((id) => deleteInvestigation(this.fetch, id))
    );
    this.investigationIds.length = 0;
  }
}
