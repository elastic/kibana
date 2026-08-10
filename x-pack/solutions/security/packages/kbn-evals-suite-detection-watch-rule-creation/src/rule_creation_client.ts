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
import { RULE_CREATION_WORKFLOW_ID, WORKFLOWS_API_VERSION } from './constants';
import { draftRuleSchema, type DraftRule } from './types';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// WAITING_FOR_INPUT is in NonTerminalExecutionStatuses in @kbn/workflows, so we
// must add it explicitly — otherwise the poll loop spins for maxWaitMs waiting
// for a workflow that is intentionally paused waiting for human approval.
const shouldStopPolling = (status: ExecutionStatus) =>
  TerminalExecutionStatuses.includes(status) || status === ExecutionStatus.WAITING_FOR_INPUT;

const stepOutputSchema = z.object({ structured_output: draftRuleSchema }).partial();

// Each step produces two entries in stepExecutions: an "enter" record (output: null)
// and a "result" record (output: data). Find the result record for draft_creation.
const extractRuleFromSteps = (steps: WorkflowStepExecutionDto[]): DraftRule | undefined => {
  const draftSteps = steps.filter((s) => s.stepId === 'draft_creation');
  const resultRecord = draftSteps.find((s) => s.output != null);
  const parsed = stepOutputSchema.safeParse(resultRecord?.output);
  return parsed.success ? parsed.data.structured_output : undefined;
};

export interface RuleCreationResult {
  rule: DraftRule | undefined;
  pendingApproval: boolean;
  traceId: string | undefined;
}

export class RuleCreationClient {
  private readonly pendingExecutionIds: string[] = [];

  constructor(private readonly fetch: HttpHandler, private readonly log: ToolingLog) {}

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

      if (shouldStopPolling(execution.status)) break;
      await sleep(pollIntervalMs);
    }

    if (!execution) {
      throw new Error(`No execution returned for workflow run ${workflowExecutionId}`);
    }

    if (!shouldStopPolling(execution.status)) {
      this.log.warning(
        `Workflow ${workflowExecutionId} did not reach a terminal state within ${maxWaitMs}ms (last status: ${execution.status})`
      );
    }

    const rule = extractRuleFromSteps(execution.stepExecutions ?? []);

    if (!rule) {
      this.log.warning(
        `Workflow ${workflowExecutionId} reached ${execution.status} but draft_creation produced no rule — evaluators will score 0`
      );
    }

    const result: RuleCreationResult = {
      rule,
      pendingApproval: execution.status === ExecutionStatus.WAITING_FOR_INPUT,
      traceId: execution.traceId,
    };
    return result;
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
