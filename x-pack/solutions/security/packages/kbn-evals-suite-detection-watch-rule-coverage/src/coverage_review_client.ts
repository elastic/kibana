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
  AI_INDEX_ID,
  AI_INDEX_NAME,
  COVERAGE_CHECK_STEP_ID,
  COVERAGE_REVIEW_WORKFLOW_ID,
  EVAL_SPACE_ID,
  WORKFLOWS_API_VERSION,
} from './constants';
import type { CoverageCheckResult, CoverageInput } from './types';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const workflowsHeaders = { 'elastic-api-version': WORKFLOWS_API_VERSION };

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

/**
 * Reads the verdict from the `coverage_check` step records. A step writes one record when it
 * starts (no output) and one with its result, so the record with an output is the result.
 */
export const extractCoverageCheck = (
  steps: WorkflowStepExecutionDto[]
): Omit<CoverageCheckResult, 'workflowExecutionId' | 'executionStatus'> => {
  const records = steps.filter(({ stepId }) => stepId === COVERAGE_CHECK_STEP_ID);
  const failedRecord = records.find(({ error }) => error != null);
  const output = asRecord(records.find((record) => record.output != null)?.output);
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
  };
};

/** True once the check has a result, or the run can no longer produce one. */
const isCheckSettled = ({ status, stepExecutions = [] }: WorkflowExecutionDto): boolean =>
  TerminalExecutionStatuses.includes(status) ||
  stepExecutions.some(
    ({ stepId, output, error }) =>
      stepId === COVERAGE_CHECK_STEP_ID && (output != null || error != null)
  );

/**
 * Runs the managed coverage review for one gap and returns what its `coverage_check` step
 * decided. Each run writes its own knowledge indicator with a fresh id, because the review
 * allows one run per indicator at a time and drops a second one.
 *
 * The run stops after the check: the review then waits up to days for an analyst to decide
 * on the proposal, so the client cancels it and deletes the indicator.
 */
export class CoverageReviewClient {
  constructor(
    private readonly fetch: HttpHandler,
    private readonly esClient: EsClient,
    private readonly log: ToolingLog,
    /** Inference endpoint the check must run on. A run on any other model is an error. */
    private readonly expectedConnectorId: string
  ) {}

  async run(
    { gapId, indicator }: CoverageInput,
    { maxWaitMs = 15 * 60_000, pollIntervalMs = 5_000 } = {}
  ): Promise<CoverageCheckResult> {
    const kiId = `eval-coverage-${gapId.toLowerCase()}-${uuidv4()}`;
    await this.writeIndicator(kiId, indicator);

    let workflowExecutionId: string | undefined;
    try {
      ({ workflowExecutionId } = await this.fetch<{ workflowExecutionId: string }>(
        `/api/workflows/workflow/${COVERAGE_REVIEW_WORKFLOW_ID}/run`,
        {
          method: 'POST',
          headers: workflowsHeaders,
          body: JSON.stringify({
            inputs: { ki_id: kiId, ai_index_id: AI_INDEX_ID, autonomy_level: 'assisted' },
          }),
        }
      ));
      this.log.info(`[${gapId}] started coverage review ${workflowExecutionId}`);

      const execution = await this.pollUntilCheckSettled(
        workflowExecutionId,
        maxWaitMs,
        pollIntervalMs
      );
      const result: CoverageCheckResult = {
        workflowExecutionId,
        executionStatus: execution.status,
        ...extractCoverageCheck(execution.stepExecutions ?? []),
      };
      // A score from another model would be filed under the subject model. Fail the example.
      if (result.connectorId && result.connectorId !== this.expectedConnectorId) {
        throw new Error(
          `[${gapId}] the check ran on ${result.connectorId}, not on ${this.expectedConnectorId}`
        );
      }
      this.log.info(
        `[${gapId}] verdict=${result.verdict ?? 'none'} rule="${result.ruleName ?? ''}" (${
          result.ruleId ?? 'no id'
        })${result.checkFailed ? ` check failed: ${result.checkError}` : ''}`
      );
      return result;
    } finally {
      if (workflowExecutionId) {
        await this.cancel(workflowExecutionId);
      }
      await this.deleteIndicator(kiId);
    }
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
        attributes: { ...indicator.attributes, status: 'pending', space_id: EVAL_SPACE_ID },
        '@timestamp': now,
        updated_at: now,
      },
    });
  }

  private async deleteIndicator(kiId: string): Promise<void> {
    try {
      await this.esClient.delete({ index: AI_INDEX_NAME, id: kiId, refresh: 'wait_for' });
    } catch (err) {
      this.log.warning(`Could not delete indicator ${kiId}: ${String(err)}`);
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
      this.log.debug(`Cancel of ${workflowExecutionId} returned: ${String(err)}`);
    }
  }
}
