/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  extractAgentConversationIds,
  readAgentToolCallsFromTraces,
} from '@kbn/security-evals-workflow-traces';
import {
  ExecutionStatus,
  TerminalExecutionStatuses,
  type WorkflowExecutionDto,
} from '@kbn/workflows';
import {
  FP_TP_VERDICTS,
  PUBLIC_API_VERSION,
  type FpTpOutcome,
  type FpTpVerdict,
} from './constants';
import type { FpTpSeededEvidence } from './world';

const OUTPUT_STEP_TYPE = 'workflow.output';

/** The analysis output's `payload`, as the contract defines it. */
export interface FpTpPayload {
  verdict?: string;
  summary_markdown?: string;
  rationale_markdown?: string;
}

/** The analysis's execution output. Only `payload` is graded for now. */
export interface FpTpAnalysisOutput {
  attack_discovery_id?: string;
  investigation_id?: string;
  workflow_id?: string;
  workflow_version?: number;
  coverage?: Record<string, unknown>;
  payload?: FpTpPayload;
  checks?: unknown[];
  claims?: Record<string, unknown>;
}

/** Ids this run seeded, carried in the task output so LLM graders can check citations. */
export interface FpTpSeededIds {
  attackDiscoveryId: string;
  alertIds: string[];
  entityIds: string[];
  eventIds: string[];
}

/** Task output graded by the suite's evaluators. */
export interface FpTpTaskOutput {
  executionId: string;
  executionStatus: ExecutionStatus;
  /** `failed` when the run failed or did not finish in time; otherwise the verdict. */
  outcome?: FpTpOutcome;
  payload?: FpTpPayload;
  attackDiscoveryIdEcho?: string;
  /** The whole execution output, including `coverage`, `checks`, and `claims`. */
  raw?: FpTpAnalysisOutput;
  seededIds: FpTpSeededIds;
  /** The seeded documents, so LLM graders can check the summary invents nothing. */
  seededEvidence: FpTpSeededEvidence;
  /** Conversations the workflow's `ai.agent` steps created; the caller deletes them. */
  agentConversationIds: string[];
  toolCallIds?: string[];
  toolCallsUnavailable?: boolean;
}

const isTerminal = (status: ExecutionStatus): boolean => TerminalExecutionStatuses.includes(status);

const isVerdict = (value: unknown): value is FpTpVerdict =>
  FP_TP_VERDICTS.some((verdict) => verdict === value);

const conversationIdsOf = ({ stepExecutions }: WorkflowExecutionDto): string[] =>
  extractAgentConversationIds(stepExecutions).map(({ conversationId }) => conversationId);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reads the analysis output from an execution record. The engine stores it in
 * `context.output`; the `workflow.output` step's own output is the fallback.
 */
export const readAnalysisOutput = (
  execution: WorkflowExecutionDto
): FpTpAnalysisOutput | undefined => {
  const fromContext = execution.context?.output;
  if (typeof fromContext === 'object' && fromContext !== null) {
    return fromContext as FpTpAnalysisOutput;
  }
  const step = execution.stepExecutions.find(
    ({ stepType, output }) => stepType === OUTPUT_STEP_TYPE && output
  );
  return (step?.output ?? undefined) as FpTpAnalysisOutput | undefined;
};

/**
 * Maps a terminal (or timed-out) execution to its graded outcome. Only a completed run
 * with a supported verdict has a verdict outcome; a completed run with anything else
 * has no outcome, which the evaluators score as wrong.
 */
export const toOutcome = (
  execution: WorkflowExecutionDto,
  output: FpTpAnalysisOutput | undefined
): FpTpOutcome | undefined => {
  if (execution.status !== ExecutionStatus.COMPLETED) {
    return 'failed';
  }
  const verdict = output?.payload?.verdict;
  return isVerdict(verdict) ? verdict : undefined;
};

/**
 * Runs the FP/TP analysis workflow for one seeded Attack Discovery and returns its
 * outcome. A run that is not terminal by `maxWaitMs` counts as `failed`: the contract
 * has a hard timeout, so an overrun is itself a failure. The overrun is cancelled and
 * awaited for up to `cancelWaitMs`, so the caller does not remove its fixture mid-run.
 * When a status read fails, the run is cancelled the same way and the error rethrown;
 * `onFailedReadConversationIds` receives the conversations it created, for cleanup.
 */
export const runFpTpAnalysisWorkflow = async ({
  fetch,
  log,
  traceEsClient,
  workflowId,
  attackDiscoveryId,
  investigationId,
  seededIds,
  seededEvidence,
  maxWaitMs = 15 * 60_000,
  cancelWaitMs = 60_000,
  pollIntervalMs = 3_000,
  onFailedReadConversationIds,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  traceEsClient?: EsClient;
  workflowId: string;
  attackDiscoveryId: string;
  investigationId: string;
  seededIds: FpTpSeededIds;
  seededEvidence: FpTpSeededEvidence;
  maxWaitMs?: number;
  cancelWaitMs?: number;
  pollIntervalMs?: number;
  onFailedReadConversationIds?: (conversationIds: string[]) => void;
}): Promise<FpTpTaskOutput> => {
  const { workflowExecutionId } = (await fetch(
    `/api/workflows/workflow/${encodeURIComponent(workflowId)}/run`,
    {
      method: 'POST',
      version: PUBLIC_API_VERSION,
      headers: { 'elastic-api-version': PUBLIC_API_VERSION },
      body: JSON.stringify({
        inputs: { attack_discovery_id: attackDiscoveryId, investigation_id: investigationId },
      }),
    }
  )) as { workflowExecutionId: string };

  log.info(
    `Started FP/TP analysis execution ${workflowExecutionId} for Attack Discovery ${attackDiscoveryId}`
  );

  const readExecution = async (): Promise<WorkflowExecutionDto> =>
    (await fetch(`/api/workflows/executions/${workflowExecutionId}`, {
      method: 'GET',
      version: PUBLIC_API_VERSION,
      headers: { 'elastic-api-version': PUBLIC_API_VERSION },
      query: { includeOutput: true },
    })) as WorkflowExecutionDto;

  // Cancels the run and waits up to `cancelWaitMs` for it to stop. Read errors are
  // tolerated here; the last record read, if any, is returned.
  const cancelAndAwait = async (): Promise<WorkflowExecutionDto | undefined> => {
    await fetch(`/api/workflows/executions/${encodeURIComponent(workflowExecutionId)}/cancel`, {
      method: 'POST',
      version: PUBLIC_API_VERSION,
      headers: { 'elastic-api-version': PUBLIC_API_VERSION },
    }).catch((error: Error) =>
      log.warning(
        `Could not cancel FP/TP analysis execution ${workflowExecutionId}: ${error.message}`
      )
    );
    const cancelDeadline = Date.now() + cancelWaitMs;
    let last: WorkflowExecutionDto | undefined;
    do {
      await sleep(pollIntervalMs);
      last = (await readExecution().catch(() => undefined)) ?? last;
    } while ((last === undefined || !isTerminal(last.status)) && Date.now() < cancelDeadline);
    if (last === undefined || !isTerminal(last.status)) {
      log.warning(
        `FP/TP analysis execution ${workflowExecutionId} was still ${
          last?.status ?? 'unreadable'
        } ${cancelWaitMs}ms after cancelling`
      );
    }
    return last;
  };

  const deadline = Date.now() + maxWaitMs;
  let execution: WorkflowExecutionDto;
  try {
    execution = await readExecution();
    while (!isTerminal(execution.status) && Date.now() < deadline) {
      await sleep(pollIntervalMs);
      execution = await readExecution();
    }
  } catch (error) {
    log.warning(
      `Could not read FP/TP analysis execution ${workflowExecutionId}: ${error.message}; cancelling it`
    );
    const last = await cancelAndAwait();
    if (last !== undefined) {
      onFailedReadConversationIds?.(conversationIdsOf(last));
    }
    throw error;
  }

  const timedOut = !isTerminal(execution.status);
  if (timedOut) {
    log.warning(
      `FP/TP analysis execution ${workflowExecutionId} was not terminal after ${maxWaitMs}ms (last status: ${execution.status}); cancelling it and counting it as failed`
    );
    execution = (await cancelAndAwait()) ?? execution;
  } else if (execution.status !== ExecutionStatus.COMPLETED) {
    log.info(
      `FP/TP analysis execution ${workflowExecutionId} ended ${execution.status}: ${
        execution.error?.message ?? 'no error message'
      }`
    );
  }

  const output = readAnalysisOutput(execution);

  const conversationIds = conversationIdsOf(execution);
  // The agent is tool-less, so no tool is exempt from the zero-tool guardrail.
  const { toolCallIds, unavailable } = await readAgentToolCallsFromTraces({
    traceEsClient,
    conversationIds,
    log,
    excludeToolIds: [],
  });

  return {
    executionId: workflowExecutionId,
    executionStatus: execution.status,
    outcome: timedOut ? 'failed' : toOutcome(execution, output),
    payload: output?.payload,
    attackDiscoveryIdEcho: output?.attack_discovery_id,
    raw: output,
    seededIds,
    seededEvidence,
    agentConversationIds: conversationIds,
    toolCallIds,
    toolCallsUnavailable: unavailable,
  };
};
