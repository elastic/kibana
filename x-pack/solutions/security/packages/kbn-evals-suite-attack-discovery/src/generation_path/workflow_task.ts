/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  ExecutionStatus,
  TerminalExecutionStatuses,
  type WorkflowExecutionDto,
} from '@kbn/workflows';
import { BATCHED_GENERATION_WORKFLOW_ID, PUBLIC_API_VERSION } from './constants';
import type { RoutingProof } from './token_usage';

const OUTPUT_STEP_TYPE = 'workflow.output';

/** The batched-generation workflow's `outputs`, as the YAML declares them. */
export interface BatchedGenerationOutput {
  attack_discoveries?: Array<Record<string, unknown>>;
  batch_errors?: unknown;
  batches_failed?: number;
  batches_succeeded?: number;
  batches_total?: number;
  discoveries_generated?: number;
  execution_uuids?: string[];
  alerts_analyzed?: number;
}

/** What the generation-path task hands to the evaluators. */
export interface GenerationPathTaskOutput {
  /** Same contract as the legacy suite: `null` when nothing usable came back. */
  insights: AttackDiscovery[] | null;
  errors?: string[];
  raw?: BatchedGenerationOutput;
  executionId: string;
  executionStatus: ExecutionStatus;
  timedOut: boolean;
  /** Ids in `insights` that are not seeded and do not exist in the alerts index either. */
  unknownAlertIds: string[];
  /** Ids in `insights` that exist in the alerts index but were not seeded by this run. */
  foreignAlertIds: string[];
  /** Open alerts in the lookback window that the fixture did not seed. */
  foreignOpenAlerts: number;
  /** Token docs for the run window, split into judge and subject calls. */
  routing?: RoutingProof;
  /** `batches_failed > 0`, a failed run, an overrun, or zero discoveries from analysed alerts. */
  modelFailure?: string;
}

const isTerminal = (status: ExecutionStatus): boolean => TerminalExecutionStatuses.includes(status);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const readWorkflowOutput = (
  execution: WorkflowExecutionDto
): BatchedGenerationOutput | undefined => {
  const fromContext = execution.context?.output;
  if (typeof fromContext === 'object' && fromContext !== null) {
    return fromContext as BatchedGenerationOutput;
  }
  const step = execution.stepExecutions.find(
    ({ stepType, output }) => stepType === OUTPUT_STEP_TYPE && output
  );
  return (step?.output ?? undefined) as BatchedGenerationOutput | undefined;
};

const readPath = (source: Record<string, unknown>, path: string): unknown => {
  if (path in source) {
    return source[path];
  }
  let current: unknown = source;
  for (const part of path.split('.')) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

/**
 * Maps a persisted ad hoc discovery document (`kibana.alert.attack_discovery.*`) to the
 * camelCase `AttackDiscovery` the legacy evaluators take. Reads flat or nested `_source`.
 */
export const toAttackDiscovery = (source: Record<string, unknown>): AttackDiscovery => {
  const field = (name: string) => readPath(source, `kibana.alert.attack_discovery.${name}`);
  const entitySummary = asString(field('entity_summary_markdown'));
  const tactics = asStringArray(field('mitre_attack_tactics'));
  return {
    alertIds: asStringArray(field('alert_ids')),
    title: asString(field('title')),
    summaryMarkdown: asString(field('summary_markdown')),
    detailsMarkdown: asString(field('details_markdown')),
    ...(entitySummary ? { entitySummaryMarkdown: entitySummary } : {}),
    ...(tactics.length > 0 ? { mitreAttackTactics: tactics } : {}),
    timestamp: asString(readPath(source, '@timestamp')) || new Date().toISOString(),
  };
};

/**
 * Runs the batched-generation managed workflow once with `connector_id` omitted, so the
 * run step resolves its model through the `alertzero_*` inference features. An overrun is
 * cancelled and awaited so the caller does not delete the fixture mid-run.
 */
export const runBatchedGenerationWorkflow = async ({
  fetch,
  log,
  lookback,
  maxWaitMs = 45 * 60_000,
  cancelWaitMs = 60_000,
  pollIntervalMs = 5_000,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  lookback: string;
  maxWaitMs?: number;
  cancelWaitMs?: number;
  pollIntervalMs?: number;
}): Promise<{
  execution: WorkflowExecutionDto;
  output: BatchedGenerationOutput | undefined;
  timedOut: boolean;
}> => {
  const headers = { 'elastic-api-version': PUBLIC_API_VERSION };
  const { workflowExecutionId } = (await fetch(
    `/api/workflows/workflow/${encodeURIComponent(BATCHED_GENERATION_WORKFLOW_ID)}/run`,
    {
      method: 'POST',
      version: PUBLIC_API_VERSION,
      headers,
      // `batch_size` and `max_alerts` are at the workflow's minimums; the fixture is far smaller.
      body: JSON.stringify({ inputs: { lookback, batch_size: 50, max_alerts: 100 } }),
    }
  )) as { workflowExecutionId: string };
  log.info(`Started batched generation execution ${workflowExecutionId}`);

  const readExecution = async (): Promise<WorkflowExecutionDto> =>
    (await fetch(`/api/workflows/executions/${encodeURIComponent(workflowExecutionId)}`, {
      method: 'GET',
      version: PUBLIC_API_VERSION,
      headers,
      query: { includeOutput: true },
    })) as WorkflowExecutionDto;

  const cancelAndAwait = async (): Promise<WorkflowExecutionDto | undefined> => {
    await fetch(`/api/workflows/executions/${encodeURIComponent(workflowExecutionId)}/cancel`, {
      method: 'POST',
      version: PUBLIC_API_VERSION,
      headers,
    }).catch((error: Error) =>
      log.warning(`Could not cancel execution ${workflowExecutionId}: ${error.message}`)
    );
    const cancelDeadline = Date.now() + cancelWaitMs;
    let last: WorkflowExecutionDto | undefined;
    do {
      await sleep(pollIntervalMs);
      last = (await readExecution().catch(() => undefined)) ?? last;
    } while ((last === undefined || !isTerminal(last.status)) && Date.now() < cancelDeadline);
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
    log.warning(`Could not read execution ${workflowExecutionId}: ${error.message}; cancelling it`);
    await cancelAndAwait();
    throw error;
  }

  const timedOut = !isTerminal(execution.status);
  if (timedOut) {
    log.warning(
      `Execution ${workflowExecutionId} not terminal after ${maxWaitMs}ms (${execution.status}); cancelling and counting it as failed`
    );
    execution = (await cancelAndAwait()) ?? execution;
  }

  return { execution, output: readWorkflowOutput(execution), timedOut };
};

/**
 * The workflow reports `batch_errors: []` on a clean run. Only a non-empty value is a task error;
 * otherwise the rubric evaluator would short-circuit every run to `task_error`.
 */
export const toTaskErrors = (batchErrors: unknown): string[] | undefined => {
  if (batchErrors === undefined || batchErrors === null) return undefined;
  if (Array.isArray(batchErrors) && batchErrors.length === 0) return undefined;
  if (typeof batchErrors === 'object' && Object.keys(batchErrors).length === 0) return undefined;
  return [JSON.stringify(batchErrors)];
};

/**
 * Decides whether a run is a model failure. A completed run with failed batches, or with
 * analysed alerts and no discovery, is the model's: a refusal or an empty completion comes
 * back this way. It is never an infra skip. A run that analysed zero alerts never reached the
 * model; that is an infra fault and the spec throws on it instead.
 */
export const classifyModelFailure = ({
  execution,
  output,
  timedOut,
}: {
  execution: WorkflowExecutionDto;
  output: BatchedGenerationOutput | undefined;
  timedOut: boolean;
}): string | undefined => {
  if (timedOut) {
    return `workflow did not finish in time (last status ${execution.status})`;
  }
  if (execution.status !== ExecutionStatus.COMPLETED) {
    return `workflow ${execution.status}: ${execution.error?.message ?? 'no error message'}`;
  }
  if ((output?.batches_failed ?? 0) > 0) {
    return `${output?.batches_failed} of ${output?.batches_total} batches failed: ${(
      JSON.stringify(output?.batch_errors) ?? 'no batch_errors reported'
    ).slice(0, 800)}`;
  }
  if ((output?.alerts_analyzed ?? 0) > 0 && (output?.discoveries_generated ?? 0) === 0) {
    return `model analysed ${output?.alerts_analyzed} alerts and generated no discovery (refusal or empty completion)`;
  }
  return undefined;
};
