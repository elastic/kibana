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
  ExecutionStatus,
  TerminalExecutionStatuses,
  type WorkflowExecutionDto,
  type WorkflowStepExecutionDto,
} from '@kbn/workflows';
import { API_VERSIONS, buildRespondToActionUrl, buildWorkflowSourceId } from '@kbn/inbox-common';
import {
  DRAFT_STEP_ID,
  REVIEW_STEP_ID,
  RULE_CREATION_WORKFLOW_ID,
  WORKFLOWS_API_VERSION,
} from './constants';
import { draftRuleSchema, type DraftRule } from './types';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// WAITING_FOR_INPUT is in NonTerminalExecutionStatuses in @kbn/workflows, so we
// must add it explicitly — otherwise the poll loop spins for maxWaitMs waiting
// for a workflow that is intentionally paused waiting for human approval.
const shouldStopPolling = (status: ExecutionStatus) =>
  TerminalExecutionStatuses.includes(status) || status === ExecutionStatus.WAITING_FOR_INPUT;

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
    isDone: (status: ExecutionStatus) => boolean;
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

      if (isDone(execution.status)) break;
      await sleep(pollIntervalMs);
    }

    if (!execution) {
      throw new Error(`No execution state returned while polling ${workflowExecutionId}`);
    }
    return execution;
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
    const { workflowExecutionId } = await this.fetch<{ workflowExecutionId: string }>(
      `/api/workflows/workflow/${RULE_CREATION_WORKFLOW_ID}/run`,
      {
        method: 'POST',
        version: WORKFLOWS_API_VERSION,
        headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
        body: JSON.stringify({ inputs: input }),
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

    if (!shouldStopPolling(execution.status)) {
      this.log.warning(
        `Workflow ${workflowExecutionId} did not reach a terminal state within ${maxWaitMs}ms (last status: ${execution.status})`
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
      pendingApproval: execution.status === ExecutionStatus.WAITING_FOR_INPUT,
      traceId: execution.traceId,
      workflowExecutionId,
      stepExecutions: execution.stepExecutions ?? [],
    };
    return result;
  }

  /**
   * Responds to the review_creation approval gate for a paused workflow execution, then polls
   * until the execution reaches a terminal state. Call this after run() returns pendingApproval:true.
   */
  async respond({
    workflowExecutionId,
    stepExecutions,
    approved,
    maxWaitMs = 5 * 60_000,
    pollIntervalMs = 5_000,
  }: {
    workflowExecutionId: string;
    stepExecutions: WorkflowStepExecutionDto[];
    approved: boolean;
    maxWaitMs?: number;
    pollIntervalMs?: number;
  }): Promise<WorkflowExecutionDto> {
    const reviewStep = stepExecutions.find((s) => s.stepId === REVIEW_STEP_ID && s.output == null);
    if (!reviewStep) {
      throw new Error(
        `${REVIEW_STEP_ID} step not found in waiting state for execution ${workflowExecutionId}`
      );
    }

    const sourceId = buildWorkflowSourceId(
      RULE_CREATION_WORKFLOW_ID,
      workflowExecutionId,
      reviewStep.id
    );
    await this.respondToApprovalGate({ sourceId, approved });

    return this.pollExecution({
      workflowExecutionId,
      isDone: (status) => TerminalExecutionStatuses.includes(status),
      maxWaitMs,
      pollIntervalMs,
    });
  }

  private async respondToApprovalGate({
    sourceId,
    approved,
  }: {
    sourceId: string;
    approved: boolean;
  }): Promise<void> {
    this.log.info(`Sending approval=${approved} for inbox source ${sourceId}`);
    await this.fetch(buildRespondToActionUrl('workflows', sourceId), {
      method: 'POST',
      headers: { 'elastic-api-version': API_VERSIONS.internal.v1, 'kbn-xsrf': 'true' },
      body: JSON.stringify({ input: { approved } }),
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
  }
}
