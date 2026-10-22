/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Client as EsClient } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import {
  NonTerminalExecutionStatuses,
  TerminalExecutionStatuses,
  type WorkflowExecutionDto,
  type WorkflowExecutionListDto,
} from '@kbn/workflows';
import { RULE_CREATION_WORKFLOW_ID, WORKFLOWS_API_VERSION } from './constants';
import type { RuleCreationInput } from './rule_creation_client';
import { bindCoverageWorker } from './worker_identity';

const SWEEP_ID = 'system-security-coverage-worker';
const REVIEW_ID = 'system-security-coverage-review';
const KI_INDEX = 'ai-index-idx-security-investigations';
const options = {
  version: WORKFLOWS_API_VERSION,
  headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** HTTP 404 from the Kibana HttpHandler or the ES client: the resource is already gone. */
const isNotFound = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as {
    status?: number;
    statusCode?: number;
    response?: { status?: number };
    meta?: { statusCode?: number };
  };
  return [e.status, e.statusCode, e.response?.status, e.meta?.statusCode].includes(404);
};

export const childExecutionId = (
  execution: WorkflowExecutionDto,
  stepId: string
): string | undefined => {
  const step = execution.stepExecutions?.find(
    (entry) => entry.stepId === stepId && entry.stepType?.startsWith('workflow.execute')
  );
  // Synchronous execute steps keep the child id in state while waiting and after completion.
  const output = step?.output as { executionId?: unknown } | undefined;
  const state = step?.state as { executionId?: unknown } | undefined;
  const id = output?.executionId ?? state?.executionId;
  return typeof id === 'string' && id.length > 0 ? id : undefined;
};

export class CoverageChain {
  private workerId?: string;
  private spaceId?: string;
  private reviewId?: string;
  private kiId?: string;
  private readonly ownedExecutionIds = new Set<string>();

  constructor(private readonly fetch: HttpHandler, private readonly esClient: EsClient) {}

  private getExecution(id: string): Promise<WorkflowExecutionDto> {
    return this.fetch(`/api/workflows/executions/${id}`, {
      ...options,
      method: 'GET',
      query: { includeOutput: true },
    });
  }

  private listExecutions(
    workflowId: string,
    activeOnly = false
  ): Promise<WorkflowExecutionListDto> {
    return this.fetch(`/api/workflows/workflow/${workflowId}/executions`, {
      ...options,
      method: 'GET',
      query: {
        statuses: activeOnly
          ? [...NonTerminalExecutionStatuses]
          : [...NonTerminalExecutionStatuses, ...TerminalExecutionStatuses],
        size: 100,
      },
    });
  }

  private async drain(workflowIds: string[], pollIntervalMs: number): Promise<void> {
    for (const id of workflowIds) {
      await this.fetch(`/api/workflows/workflow/${id}/executions/cancel`, {
        ...options,
        method: 'POST',
      });
      const deadline = Date.now() + 60_000;
      while ((await this.listExecutions(id, true)).results.length > 0) {
        if (Date.now() >= deadline) throw new Error(`Cannot drain active executions of ${id}`);
        await sleep(pollIntervalMs);
      }
    }
  }

  private async initialize(pollIntervalMs: number): Promise<void> {
    if (this.workerId) return;
    const since = Date.now();
    const bound = await bindCoverageWorker(this.fetch);
    const workflowIds = [bound.workflowId, SWEEP_ID, REVIEW_ID, RULE_CREATION_WORKFLOW_ID];
    if (bound.enabledByBind) {
      // Enabling schedules an immediate tick even with a long interval. Drain before seeding.
      const deadline = Date.now() + 60_000;
      while (
        !(await this.listExecutions(bound.workflowId)).results.some(
          (execution) =>
            execution.triggeredBy === 'scheduled' && Date.parse(execution.startedAt) >= since
        )
      ) {
        if (Date.now() >= deadline) throw new Error('Coverage worker bind tick never appeared');
        await sleep(pollIntervalMs);
      }
    }
    await this.drain(workflowIds, pollIntervalMs);
    const space = await this.fetch<{ id: string }>('/internal/spaces/_active_space', {
      method: 'GET',
    });
    this.spaceId = space.id;
    this.workerId = bound.workflowId;
  }

  private async waitForChild(
    parentId: string,
    stepId: string,
    deadline: number,
    pollIntervalMs: number
  ): Promise<string> {
    while (Date.now() < deadline) {
      const execution = await this.getExecution(parentId);
      const id = childExecutionId(execution, stepId);
      if (id) {
        this.ownedExecutionIds.add(id);
        return id;
      }
      const coverage = execution.stepExecutions?.find(
        (step) => step.stepId === 'coverage_check' && step.output != null
      );
      const verdict = (coverage?.output as { structured_output?: { verdict?: string } } | undefined)
        ?.structured_output?.verdict;
      if (stepId === 'run_rule_creation' && verdict && verdict !== 'no_coverage') {
        throw new Error(
          `Coverage review ${parentId} judged the gap "${verdict}", so rule creation never ran. ` +
            'The example needs a gap no existing rule covers.'
        );
      }
      if (TerminalExecutionStatuses.includes(execution.status)) {
        throw new Error(
          `Coverage chain ${parentId} ended ${execution.status} without ${stepId}: ${JSON.stringify(
            execution.error ?? coverage?.output ?? 'no child dispatched'
          )}`
        );
      }
      await sleep(pollIntervalMs);
    }
    throw new Error(`Coverage chain timed out waiting for ${stepId} on ${parentId}`);
  }

  async start(
    input: RuleCreationInput,
    deadline: number,
    pollIntervalMs: number
  ): Promise<{ workflowExecutionId: string; investigationId: string }> {
    await this.initialize(pollIntervalMs);
    await this.cleanup(pollIntervalMs);
    this.kiId = `rule-creation-eval-${uuidv4()}`;
    const now = new Date().toISOString();
    await this.esClient.index({
      index: KI_INDEX,
      id: this.kiId,
      refresh: 'wait_for',
      document: {
        '@timestamp': now,
        id: this.kiId,
        updated_at: now,
        type: 'security.coverage',
        title: input.gap_description,
        description: input.gap_description,
        content: input.evidence,
        tags: ['consumer:detection', 'status:pending', 'watch:hunt'],
        attributes: {
          status: 'pending',
          technique: input.technique,
          report_id: this.kiId,
          watch_id: 'hunt',
          producer: 'hunt.packageReport.v1',
          space_id: this.spaceId,
        },
      },
    });
    const { workflowExecutionId: workerExecutionId } = await this.fetch<{
      workflowExecutionId: string;
    }>(`/api/workflows/workflow/${this.workerId}/run`, {
      ...options,
      method: 'POST',
      body: JSON.stringify({ inputs: {} }),
    });
    this.ownedExecutionIds.add(workerExecutionId);
    const sweepId = await this.waitForChild(
      workerExecutionId,
      'run_rule_coverage',
      deadline,
      pollIntervalMs
    );
    // Match the exact KI and sweep, not a recent unrelated or scheduled review.
    while (Date.now() < deadline) {
      const { results } = await this.listExecutions(REVIEW_ID);
      for (const candidate of results.filter(
        (execution) => execution.concurrencyGroupKey === `coverage-${this.kiId}`
      )) {
        const review = await this.getExecution(candidate.id);
        if (review.context?.parentWorkflowExecutionId === sweepId) {
          this.reviewId = review.id;
          this.ownedExecutionIds.add(review.id);
          break;
        }
      }
      if (this.reviewId) break;
      const sweep = await this.getExecution(sweepId);
      if (TerminalExecutionStatuses.includes(sweep.status)) {
        throw new Error(`Coverage sweep ${sweepId} ended ${sweep.status} without our KI review`);
      }
      await sleep(pollIntervalMs);
    }
    if (!this.reviewId) throw new Error(`No coverage review for KI ${this.kiId}`);
    const workflowExecutionId = await this.waitForChild(
      this.reviewId,
      'run_rule_creation',
      deadline,
      pollIntervalMs
    );
    const creation = await this.getExecution(workflowExecutionId);
    if (creation.effectiveIdentity?.type !== 'service_account') {
      throw new Error(`Rule creation ${workflowExecutionId} has no inherited service account`);
    }
    const inputs = creation.context?.inputs as { investigation_id?: string } | undefined;
    if (!inputs?.investigation_id) {
      throw new Error(`Rule creation ${workflowExecutionId} has no investigation_id`);
    }
    return { workflowExecutionId, investigationId: inputs.investigation_id };
  }

  private async cancelOwned(id: string, pollIntervalMs: number): Promise<void> {
    const execution = await this.getExecution(id);
    if (TerminalExecutionStatuses.includes(execution.status)) return;
    await this.fetch(`/api/workflows/executions/${id}/cancel`, {
      ...options,
      method: 'POST',
    });
    const deadline = Date.now() + 60_000;
    while (!TerminalExecutionStatuses.includes((await this.getExecution(id)).status)) {
      if (Date.now() >= deadline) throw new Error(`Cannot cancel owned execution ${id}`);
      await sleep(pollIntervalMs);
    }
  }

  /**
   * Cancels every execution this chain owns and deletes its KI. Each step is attempted
   * independently so one stuck execution cannot leak the others or the KI, and a resource
   * that is already gone (404) counts as cleaned. Anything left over stays tracked, is
   * retried by the next cleanup, and is reported in one aggregate error.
   */
  async cleanup(pollIntervalMs = 1_000): Promise<void> {
    const failures: string[] = [];
    for (const id of [...this.ownedExecutionIds]) {
      try {
        await this.cancelOwned(id, pollIntervalMs);
        this.ownedExecutionIds.delete(id);
      } catch (error) {
        if (isNotFound(error)) this.ownedExecutionIds.delete(id);
        else failures.push(`execution ${id}: ${errorMessage(error)}`);
      }
    }
    if (this.ownedExecutionIds.size === 0) this.reviewId = undefined;
    if (this.kiId) {
      try {
        await this.esClient.delete({ index: KI_INDEX, id: this.kiId, refresh: 'wait_for' });
        this.kiId = undefined;
      } catch (error) {
        if (isNotFound(error)) this.kiId = undefined;
        else failures.push(`investigation ${this.kiId}: ${errorMessage(error)}`);
      }
    }
    if (failures.length > 0) {
      throw new Error(`Coverage chain cleanup incomplete: ${failures.join('; ')}`);
    }
  }
}
