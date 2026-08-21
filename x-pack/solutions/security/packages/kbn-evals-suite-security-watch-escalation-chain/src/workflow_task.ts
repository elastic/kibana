/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { TerminalExecutionStatuses, type ExecutionStatus } from '@kbn/workflows';
import { WORKFLOWS_API_VERSION } from './constants';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isTerminal = (status: ExecutionStatus): boolean => TerminalExecutionStatuses.includes(status);

export interface WatchWorkflowExecution {
  executionId: string;
  status: ExecutionStatus;
  error?: unknown;
}

/**
 * Starts a managed Watch orchestrator workflow and polls until it reaches a
 * terminal status. Used to drive Dark/Deep/Detection directly with a
 * synthetic `escalation` (or `detectionChangeSignal`/`ruleTuningTrigger`)
 * payload — the exact `inputs.*` shape a real upstream Watch produces,
 * exercising the same code path bugs #9/#10 broke.
 */
export const runWatchWorkflow = async ({
  fetch,
  log,
  workflowId,
  inputs,
  maxWaitMs = 12 * 60_000,
  pollIntervalMs = 3_000,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  workflowId: string;
  inputs: Record<string, unknown>;
  maxWaitMs?: number;
  pollIntervalMs?: number;
}): Promise<WatchWorkflowExecution> => {
  const { workflowExecutionId } = (await fetch(`/api/workflows/workflow/${workflowId}/run`, {
    method: 'POST',
    version: WORKFLOWS_API_VERSION,
    headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
    body: JSON.stringify({ inputs }),
  })) as { workflowExecutionId: string };

  log.info(`Started ${workflowId} execution ${workflowExecutionId}`);

  const deadline = Date.now() + maxWaitMs;
  let execution: { status: ExecutionStatus; error?: unknown } | undefined;

  while (Date.now() < deadline) {
    execution = (await fetch(`/api/workflows/executions/${workflowExecutionId}`, {
      method: 'GET',
      version: WORKFLOWS_API_VERSION,
      headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
      query: { includeOutput: true },
    })) as { status: ExecutionStatus; error?: unknown };

    if (isTerminal(execution.status)) break;
    await sleep(pollIntervalMs);
  }

  if (!execution) {
    throw new Error(`No execution returned for ${workflowId} run ${workflowExecutionId}`);
  }

  if (!isTerminal(execution.status)) {
    log.warning(
      `${workflowId} execution ${workflowExecutionId} did not reach terminal status within ${maxWaitMs}ms (last status: ${execution.status})`
    );
  }

  return { executionId: workflowExecutionId, status: execution.status, error: execution.error };
};

/**
 * Reads back every proposal ES has persisted for a given investigationId,
 * across every Watch tier. This is the ground truth for the L4 durable-outcome
 * assertion: bugs #9/#10 meant Dark/Deep/Detection proposals either never
 * carried the real investigationId (silently forking into orphaned threads)
 * or Detection's two routes never ran at all (zero proposals from tier 5).
 */
export const readProposalsForInvestigation = async ({
  esClient,
  investigationId,
  index = 'pnd-proposals',
}: {
  esClient: EsClient;
  investigationId: string;
  index?: string;
}): Promise<Array<Record<string, unknown>>> => {
  const res = await esClient.search({
    index,
    size: 50,
    query: { term: { investigationId } },
    sort: [{ createdAt: { order: 'asc' as const, unmapped_type: 'date' as const } }],
  });
  return (res.hits?.hits ?? []).map((h) => h._source as Record<string, unknown>);
};
