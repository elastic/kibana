/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { z } from '@kbn/zod';
import {
  ExecutionStatus,
  TerminalExecutionStatuses,
  type WorkflowExecutionDto,
  type WorkflowStepExecutionDto,
} from '@kbn/workflows';
import {
  PROPOSALS_API_VERSION,
  PROPOSALS_INTERNAL_URL,
  type ListProposalsResponse,
  type Proposal,
} from '@kbn/proposals-common';
import { CoverageChain } from './coverage_chain';
import { AGENT_BUILDER_API_VERSION, DRAFT_STEP_ID, WORKFLOWS_API_VERSION } from './constants';
import { draftRuleSchema, type DraftRule } from './types';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The ai.agent step's persisted output is
// `{ message, structured_output: { rule, attachment_id, attachment_version, reason },
//    conversation_id, metadata: { usage } }` — the rule is NESTED under
// structured_output.rule (see the managed yaml templates:
// `steps.draft_creation.output.structured_output.rule.query`). Parsing structured_output
// as the rule itself strips the wrapper and yields an empty object — every evaluator
// then sees a rule with no fields (the false-zero failure this fixed).
const stepOutputSchema = z
  .object({
    structured_output: z
      .object({
        rule: draftRuleSchema,
        // The workflow has no `skipped` flag: when the agent produces no rule it returns
        // empty strings for name/description/query and says why under `reason`.
        reason: z.string(),
      })
      .partial(),
    metadata: z.object({ usage: z.object({ connectorId: z.string() }).partial() }).partial(),
  })
  .partial();

export interface DraftOutcome {
  rule: DraftRule | undefined;
  /** True when the agent declined to draft and said why (distinct from a failed draft). */
  skipped: boolean;
  /** The agent's one-sentence reason, when it declined. */
  skipReason: string | undefined;
  /** Connector the ai.agent step actually ran on, as reported by the step's usage metadata. */
  connectorId: string | undefined;
}

// Each step produces two entries in stepExecutions: an "enter" record (output: null)
// and a "result" record (output: data). Find the result record for draft_creation.
export const extractDraftFromSteps = (steps: WorkflowStepExecutionDto[]): DraftOutcome => {
  const resultRecord = steps.find((s) => s.stepId === DRAFT_STEP_ID && s.output != null);
  const parsed = stepOutputSchema.safeParse(resultRecord?.output);
  if (!parsed.success) {
    return { rule: undefined, skipped: false, skipReason: undefined, connectorId: undefined };
  }
  const out = parsed.data.structured_output;
  const connectorId = parsed.data.metadata?.usage?.connectorId;
  // The workflow's own `draft_ready` test: a draft with no query is not a rule. The
  // schema forces every rule field to be present, so "no rule" arrives as empty strings.
  const hasRule = Boolean(out?.rule?.query?.trim());
  const reason = out?.reason?.trim();
  return {
    rule: hasRule ? out?.rule : undefined,
    skipped: !hasRule && Boolean(reason),
    skipReason: reason || undefined,
    connectorId,
  };
};

export interface RuleCreationResult extends DraftOutcome {
  /** True when the run parked on a pending proposal awaiting the analyst. */
  pendingApproval: boolean;
  /** The pending proposal, when the run reached the gate. */
  proposalId: string | undefined;
  /** Investigation (conversation) the proposal is recorded on. */
  investigationId: string;
  traceId: string | undefined;
  workflowExecutionId: string;
  status: ExecutionStatus;
  stepExecutions: WorkflowStepExecutionDto[];
}

export interface RuleCreationInput {
  technique: string;
  gap_description: string;
  evidence: string;
  confidence: number;
}

export class RuleCreationClient {
  private readonly pendingExecutionIds: string[] = [];
  private readonly investigationIds: string[] = [];

  private readonly chain: CoverageChain;
  private runQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly fetch: HttpHandler,
    private readonly log: ToolingLog,
    esClient: EsClient
  ) {
    this.chain = new CoverageChain(fetch, esClient);
  }

  private async getExecution(workflowExecutionId: string): Promise<WorkflowExecutionDto> {
    return this.fetch<WorkflowExecutionDto>(`/api/workflows/executions/${workflowExecutionId}`, {
      method: 'GET',
      version: WORKFLOWS_API_VERSION,
      headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
      query: { includeOutput: true },
    });
  }

  private async findPendingProposal(investigationId: string): Promise<Proposal | undefined> {
    const { proposals } = await this.fetch<ListProposalsResponse>(PROPOSALS_INTERNAL_URL, {
      method: 'GET',
      version: PROPOSALS_API_VERSION,
      headers: { 'elastic-api-version': PROPOSALS_API_VERSION },
      query: { conversationId: investigationId, status: 'pending', size: 1 },
    });
    return proposals[0];
  }

  run(options: {
    input: RuleCreationInput;
    maxWaitMs?: number;
    pollIntervalMs?: number;
  }): Promise<RuleCreationResult> {
    // The production sweep is concurrency-limited; parallel examples would harvest each other.
    const result = this.runQueue.then(() => this.runThroughCoverage(options));
    this.runQueue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  /**
   * Runs the managed workflow and waits until it either finishes or parks on the analyst's
   * decision. `propose_creation` and `preview_creation` both park the run in
   * WAITING_FOR_CHILD, so that status alone does not mean the gate was reached: the run is
   * only at the gate once a pending proposal exists on its investigation.
   */
  private async runThroughCoverage({
    input,
    maxWaitMs = 10 * 60_000,
    pollIntervalMs = 5_000,
  }: {
    input: RuleCreationInput;
    maxWaitMs?: number;
    pollIntervalMs?: number;
  }): Promise<RuleCreationResult> {
    const deadline = Date.now() + maxWaitMs;
    const { workflowExecutionId, investigationId } = await this.chain.start(
      input,
      deadline,
      pollIntervalMs
    );
    this.investigationIds.push(investigationId);

    this.log.info(
      `Started rule-creation workflow execution ${workflowExecutionId} on investigation ${investigationId}`
    );
    this.pendingExecutionIds.push(workflowExecutionId);
    let execution: WorkflowExecutionDto | undefined;
    let proposal: Proposal | undefined;
    while (Date.now() < deadline) {
      execution = await this.getExecution(workflowExecutionId);
      if (TerminalExecutionStatuses.includes(execution.status)) break;
      if (execution.status === ExecutionStatus.WAITING_FOR_CHILD) {
        proposal = await this.findPendingProposal(investigationId);
        if (proposal) break;
      }
      await sleep(pollIntervalMs);
    }
    if (!execution) {
      throw new Error(`No execution state returned while polling ${workflowExecutionId}`);
    }

    if (
      execution.status === ExecutionStatus.FAILED ||
      execution.status === ExecutionStatus.SKIPPED
    ) {
      throw new Error(
        `Rule creation ${workflowExecutionId} ended ${execution.status}: ${JSON.stringify(
          execution.error
        )}`
      );
    }
    if (!proposal && !TerminalExecutionStatuses.includes(execution.status)) {
      this.log.warning(
        `Workflow ${workflowExecutionId} neither finished nor reached the proposal gate within ${maxWaitMs}ms (last status: ${execution.status})`
      );
    }

    const draft = extractDraftFromSteps(execution.stepExecutions ?? []);

    if (draft.skipped) {
      this.log.info(
        `Workflow ${workflowExecutionId}: draft_creation returned no rule (${draft.skipReason})`
      );
    } else if (!draft.rule) {
      this.log.warning(
        `Workflow ${workflowExecutionId} reached ${execution.status} but draft_creation produced no rule and gave no reason — evaluators will score N/A`
      );
    }

    return {
      ...draft,
      pendingApproval: proposal !== undefined,
      proposalId: proposal?.id,
      investigationId,
      traceId: execution.traceId,
      workflowExecutionId,
      status: execution.status,
      stepExecutions: execution.stepExecutions ?? [],
    };
  }

  /**
   * Decides the pending proposal the way an analyst does — through the proposals API — then
   * polls until the rule-creation run reaches a terminal state. Call after run() returned
   * pendingApproval:true.
   */
  async respond({
    workflowExecutionId,
    proposalId,
    approved,
    maxWaitMs = 5 * 60_000,
    pollIntervalMs = 5_000,
    gateWaitMs = 60_000,
  }: {
    workflowExecutionId: string;
    proposalId: string | undefined;
    approved: boolean;
    maxWaitMs?: number;
    pollIntervalMs?: number;
    gateWaitMs?: number;
  }): Promise<WorkflowExecutionDto> {
    if (!proposalId) {
      throw new Error(`No pending proposal to decide for execution ${workflowExecutionId}`);
    }

    await this.waitForProposalGate({ proposalId, maxWaitMs: gateWaitMs, pollIntervalMs });

    const action = approved ? 'approve' : 'dismiss';
    this.log.info(`Sending ${action} for proposal ${proposalId}`);
    await this.fetch(`${PROPOSALS_INTERNAL_URL}/${encodeURIComponent(proposalId)}/${action}`, {
      method: 'POST',
      version: PROPOSALS_API_VERSION,
      headers: { 'elastic-api-version': PROPOSALS_API_VERSION },
      body: JSON.stringify(approved ? {} : { dismissReason: 'no_reason' }),
    });

    const deadline = Date.now() + maxWaitMs;
    let execution = await this.getExecution(workflowExecutionId);
    while (!TerminalExecutionStatuses.includes(execution.status) && Date.now() < deadline) {
      await sleep(pollIntervalMs);
      execution = await this.getExecution(workflowExecutionId);
    }
    return execution;
  }

  /**
   * The proposal row is written by the gate workflow's create step, before that same execution
   * parks on waitForInput. The proposals service refuses a decision (409 "is not waiting for
   * input") unless the gate execution is WAITING_FOR_INPUT, by design, so a decision sent in the
   * window between the two races the park. Waits, bounded, until the gate is parked; throws if
   * the gate went terminal or never parked.
   */
  async waitForProposalGate({
    proposalId,
    maxWaitMs = 60_000,
    pollIntervalMs = 1_000,
  }: {
    proposalId: string;
    maxWaitMs?: number;
    pollIntervalMs?: number;
  }): Promise<void> {
    const deadline = Date.now() + maxWaitMs;
    let last = 'gate execution not recorded on the proposal yet';
    for (;;) {
      const { workflowExecutionId } = await this.getProposal(proposalId);
      if (workflowExecutionId) {
        const { status, finishedAt } = await this.getExecution(workflowExecutionId);
        if (status === ExecutionStatus.WAITING_FOR_INPUT && !finishedAt) return;
        if (TerminalExecutionStatuses.includes(status)) {
          throw new Error(
            `Gate execution ${workflowExecutionId} for proposal ${proposalId} is already ${status}, so it can no longer be decided`
          );
        }
        last = `gate execution ${workflowExecutionId} status: ${status}`;
      }
      if (Date.now() >= deadline) {
        throw new Error(
          `Proposal ${proposalId} gate did not reach ${ExecutionStatus.WAITING_FOR_INPUT} within ${maxWaitMs}ms (${last})`
        );
      }
      await sleep(pollIntervalMs);
    }
  }

  /** Reads the proposal back; the approve/dismiss routes do not return the settled record. */
  async getProposal(proposalId: string): Promise<Proposal> {
    return this.fetch<Proposal>(`${PROPOSALS_INTERNAL_URL}/${encodeURIComponent(proposalId)}`, {
      method: 'GET',
      version: PROPOSALS_API_VERSION,
      headers: { 'elastic-api-version': PROPOSALS_API_VERSION },
    });
  }

  /**
   * Cancels every run this client started (a run parked on its proposal holds the gate open
   * for up to 72h; cancelling the parent cancels the child gate) and deletes the
   * investigations it opened.
   */
  async cancelPending(): Promise<void> {
    await this.chain.cleanup();
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
      this.investigationIds.map((id) =>
        this.fetch(`/api/agent_builder/conversations/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          version: AGENT_BUILDER_API_VERSION,
          headers: { 'elastic-api-version': AGENT_BUILDER_API_VERSION },
        })
      )
    );
    this.investigationIds.length = 0;
  }
}
