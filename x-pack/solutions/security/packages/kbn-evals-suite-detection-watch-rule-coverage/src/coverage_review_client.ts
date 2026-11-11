/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { HttpHandler } from '@kbn/core/public';
import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  TerminalExecutionStatuses,
  type WorkflowExecutionDto,
  type WorkflowStepExecutionDto,
} from '@kbn/workflows';
import {
  AGENT_BUILDER_API_VERSION,
  AGENT_BUILDER_CONVERSATIONS_PATH,
  AI_INDEX_ID,
  AI_INDEX_NAME,
  COVERAGE_CHECK_STEP_ID,
  COVERAGE_REVIEW_WORKFLOW_ID,
  CREATE_INVESTIGATION_STEP_ID,
  EVAL_INDICATOR_TAG,
  EVAL_SPACE_ID,
  WORKFLOWS_API_VERSION,
} from './constants';
import { ModelMismatchError } from './model_mismatch_error';
import type { CoverageCheckResult, CoverageInput } from './types';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const workflowsHeaders = { 'elastic-api-version': WORKFLOWS_API_VERSION };

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

const httpStatus = (error: unknown): number | undefined =>
  typeof error === 'object' && error !== null && 'status' in error
    ? (error as { status?: number }).status
    : undefined;

const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** Output of the step record that has one. A step also writes a record with no output. */
const stepOutput = (
  steps: WorkflowStepExecutionDto[],
  stepId: string
): Record<string, unknown> | undefined =>
  asRecord(steps.find((record) => record.stepId === stepId && record.output != null)?.output);

/**
 * Reads the verdict from the `coverage_check` step records. A step writes one record when it
 * starts (no output) and one with its result, so the record with an output is the result.
 */
export const extractCoverageCheck = (
  steps: WorkflowStepExecutionDto[]
): Omit<CoverageCheckResult, 'workflowExecutionId' | 'executionStatus'> => {
  const records = steps.filter(({ stepId }) => stepId === COVERAGE_CHECK_STEP_ID);
  const failedRecord = records.find(({ error }) => error != null);
  const output = stepOutput(steps, COVERAGE_CHECK_STEP_ID);
  const structured = asRecord(output?.structured_output);
  // The ai.agent step reports the connector it ran on in `metadata.usage.connectorId`.
  const connectorId = asString(asRecord(asRecord(output?.metadata)?.usage)?.connectorId);

  const verdict = asString(structured?.verdict);
  if (!structured || !verdict) {
    const checkError = failedRecord?.error
      ? String(failedRecord.error.message ?? failedRecord.error.type ?? 'unknown error')
      : records.length === 0
      ? `step ${COVERAGE_CHECK_STEP_ID} did not run`
      : `step ${COVERAGE_CHECK_STEP_ID} returned no verdict`;
    return { checkFailed: true, checkError, connectorId };
  }

  const { prebuilt_version: prebuiltVersion } = structured;
  return {
    checkFailed: false,
    connectorId,
    verdict,
    ruleId: asString(structured.rule_id),
    ruleName: asString(structured.rule_name),
    prebuiltVersion: typeof prebuiltVersion === 'number' ? prebuiltVersion : undefined,
    rationale: asString(structured.rationale),
    rationaleSummary: asString(structured.rationale_summary),
  };
};

/** Conversations the run wrote: the investigation and the conversation of the check. */
const extractConversationIds = (steps: WorkflowStepExecutionDto[]): string[] =>
  [CREATE_INVESTIGATION_STEP_ID, COVERAGE_CHECK_STEP_ID].flatMap((stepId) => {
    const id = asString(stepOutput(steps, stepId)?.conversation_id);
    return id ? [id] : [];
  });

/** True once the check has a result, or the run can no longer produce one. */
const isCheckSettled = ({ status, stepExecutions = [] }: WorkflowExecutionDto): boolean =>
  TerminalExecutionStatuses.includes(status) ||
  stepExecutions.some(
    ({ stepId, output, error }) =>
      stepId === COVERAGE_CHECK_STEP_ID && (output != null || error != null)
  );

/** What one run wrote to the stack, so it can be removed. */
interface OpenRun {
  kiId: string;
  workflowExecutionId?: string;
  conversationIds: string[];
}

/**
 * Runs the managed coverage review for one gap and returns what its `coverage_check` step
 * decided. Each run writes its own knowledge indicator with a fresh id, because the review
 * allows one run per indicator at a time and drops a second one.
 *
 * The run stops after the check: the review then waits up to days for an analyst to decide
 * on the proposal. The client cancels it and removes the indicator and the conversations.
 */
export class CoverageReviewClient {
  /** Runs that started and are not removed yet. The worker teardown removes what is left. */
  private readonly openRuns = new Set<OpenRun>();

  constructor(
    private readonly fetch: HttpHandler,
    private readonly esClient: EsClient,
    private readonly log: ToolingLog,
    /** Inference endpoint the check must run on. A run on any other model is an error. */
    private readonly expectedConnectorId: string
  ) {}

  /**
   * An API error fails this example only: it returns a failed check. A thrown error would end
   * the whole experiment. The only error it throws is a check on the wrong model.
   */
  async run(
    { gapId, indicator }: CoverageInput,
    { maxWaitMs = 15 * 60_000, pollIntervalMs = 5_000 } = {}
  ): Promise<CoverageCheckResult> {
    const openRun: OpenRun = { kiId: uuidv4(), conversationIds: [] };
    this.openRuns.add(openRun);
    try {
      await this.writeIndicator(openRun.kiId, indicator);
      openRun.workflowExecutionId = await this.startReview(openRun.kiId);
      this.log.info(`[${gapId}] started coverage review ${openRun.workflowExecutionId}`);

      const execution = await this.pollUntilCheckSettled(
        openRun.workflowExecutionId,
        maxWaitMs,
        pollIntervalMs
      );
      const steps = execution.stepExecutions ?? [];
      openRun.conversationIds = extractConversationIds(steps);
      const result: CoverageCheckResult = {
        workflowExecutionId: openRun.workflowExecutionId,
        executionStatus: execution.status,
        ...extractCoverageCheck(steps),
      };
      if (!result.checkFailed && result.connectorId !== this.expectedConnectorId) {
        throw new ModelMismatchError(
          `[${gapId}] the check ran on ${result.connectorId ?? 'an unknown connector'}, not on ${
            this.expectedConnectorId
          }`
        );
      }
      this.log.info(
        `[${gapId}] verdict=${result.verdict ?? 'none'} rule="${result.ruleName ?? ''}" (${
          result.ruleId ?? 'no id'
        })${result.checkFailed ? ` check failed: ${result.checkError}` : ''}`
      );
      return result;
    } catch (err) {
      if (err instanceof ModelMismatchError) {
        throw err;
      }
      this.log.warning(`[${gapId}] the eval could not run the review: ${errorMessage(err)}`);
      return {
        workflowExecutionId: openRun.workflowExecutionId ?? 'not started',
        executionStatus: 'unknown',
        checkFailed: true,
        checkError: `The eval could not run the review: ${errorMessage(err)}`,
      };
    } finally {
      await this.removeRun(openRun);
    }
  }

  /** Removes what the runs that are still open wrote. For the worker teardown. */
  async removeOpenRuns(): Promise<void> {
    const runs = [...this.openRuns];
    if (runs.length > 0) {
      this.log.info(`Removing ${runs.length} coverage review runs that did not finish`);
    }
    await Promise.allSettled(runs.map((openRun) => this.removeRun(openRun)));
  }

  private async removeRun(openRun: OpenRun): Promise<void> {
    if (openRun.workflowExecutionId) {
      await this.cancel(openRun.workflowExecutionId);
    }
    await Promise.allSettled(openRun.conversationIds.map((id) => this.deleteConversation(id)));
    await this.deleteIndicator(openRun.kiId);
    this.openRuns.delete(openRun);
  }

  private async writeIndicator(kiId: string, indicator: CoverageInput['indicator']): Promise<void> {
    const now = new Date().toISOString();
    await this.esClient.index({
      index: AI_INDEX_NAME,
      id: kiId,
      refresh: 'wait_for',
      document: {
        ...indicator,
        id: kiId,
        tags: [...indicator.tags, EVAL_INDICATOR_TAG],
        attributes: { ...indicator.attributes, status: 'pending', space_id: EVAL_SPACE_ID },
        '@timestamp': now,
        updated_at: now,
      },
    });
  }

  private async startReview(kiId: string): Promise<string> {
    const { workflowExecutionId } = await this.fetch<{ workflowExecutionId: string }>(
      `/api/workflows/workflow/${COVERAGE_REVIEW_WORKFLOW_ID}/run`,
      {
        method: 'POST',
        headers: workflowsHeaders,
        body: JSON.stringify({
          inputs: { ki_id: kiId, ai_index_id: AI_INDEX_ID, autonomy_level: 'assisted' },
        }),
      }
    );
    return workflowExecutionId;
  }

  private async deleteIndicator(kiId: string): Promise<void> {
    try {
      await this.esClient.delete({ index: AI_INDEX_NAME, id: kiId, refresh: 'wait_for' });
    } catch (err) {
      if (httpStatus(err) !== 404 && asRecord(err)?.statusCode !== 404) {
        this.log.warning(`Could not delete indicator ${kiId}: ${errorMessage(err)}`);
      }
    }
  }

  private async deleteConversation(conversationId: string): Promise<void> {
    try {
      await this.fetch(
        `${AGENT_BUILDER_CONVERSATIONS_PATH}/${encodeURIComponent(conversationId)}`,
        {
          method: 'DELETE',
          headers: { 'elastic-api-version': AGENT_BUILDER_API_VERSION },
        }
      );
    } catch (err) {
      // The API answers 404 for a conversation that the caller cannot delete.
      this.log.debug(`Delete of conversation ${conversationId} returned: ${errorMessage(err)}`);
    }
  }

  private async pollUntilCheckSettled(
    workflowExecutionId: string,
    maxWaitMs: number,
    pollIntervalMs: number
  ): Promise<WorkflowExecutionDto> {
    const deadline = Date.now() + maxWaitMs;
    let execution: WorkflowExecutionDto | undefined;
    while (Date.now() < deadline) {
      execution = await this.fetch<WorkflowExecutionDto>(
        `/api/workflows/executions/${workflowExecutionId}`,
        { method: 'GET', headers: workflowsHeaders, query: { includeOutput: true } }
      );
      if (isCheckSettled(execution)) {
        return execution;
      }
      await sleep(pollIntervalMs);
    }
    if (!execution) {
      throw new Error(`No execution state returned for ${workflowExecutionId}`);
    }
    this.log.warning(
      `Coverage review ${workflowExecutionId} has no check result after ${maxWaitMs}ms (status ${execution.status})`
    );
    return execution;
  }

  private async cancel(workflowExecutionId: string): Promise<void> {
    try {
      await this.fetch(
        `/api/workflows/executions/${encodeURIComponent(workflowExecutionId)}/cancel`,
        {
          method: 'POST',
          headers: workflowsHeaders,
        }
      );
    } catch (err) {
      // A run that already ended cannot be cancelled. That is not an error here.
      this.log.debug(`Cancel of ${workflowExecutionId} returned: ${errorMessage(err)}`);
    }
  }
}
