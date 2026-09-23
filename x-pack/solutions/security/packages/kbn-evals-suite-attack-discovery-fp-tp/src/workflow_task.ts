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
  TerminalExecutionStatuses,
  type ExecutionStatus,
  type WorkflowExecutionDto,
  type WorkflowStepExecutionDto,
} from '@kbn/workflows';
import { FP_TP_ANALYSIS_WORKFLOW_ID, WORKFLOWS_API_VERSION } from './constants';

/**
 * Task module: runs the FP/TP analysis workflow
 * (`system-security-attack-discovery-fp-tp-analysis`) for one corpus case and
 * extracts the verdict from the workflow output.
 *
 * The workflow emits `verdict` / `summary_markdown` / `rationale_markdown` /
 * `analysis_execution_id` at the workflow-output level (see
 * attack_discovery_fp_tp_analysis.yaml); the agent's structured output uses
 * `confidence` (not `confidence_score`).
 */

/** The `ai.agent` step whose structured output we grade. */
const AGENT_STEP_TYPE = 'ai.agent';
/** stepId fallbacks for execution records that omit `stepType`. */
const AGENT_STEP_ID_FALLBACKS = ['runAgent_step', 'onechat_runAgent_step'];

const isAgentStep = (step: WorkflowStepExecutionDto): boolean =>
  step.stepType === AGENT_STEP_TYPE ||
  (step.stepType === undefined && AGENT_STEP_ID_FALLBACKS.includes(step.stepId));

/** Verdict as the workflow's `ai.agent` step is schema-constrained to return it. */
export interface WorkflowVerdict {
  id?: string;
  verdict?: string;
  label?: string;
  classification?: string;
  summary_markdown?: string;
  confidence?: number;
  rationale_markdown?: string;
}

/** The workflow output shape of the fp-tp analysis workflow. */
interface WorkflowOutput {
  verdict?: string;
  summary_markdown?: string;
  rationale_markdown?: string;
  analysis_execution_id?: string;
  attack_discovery_id?: string;
}

interface StructuredOutput {
  verdict?: WorkflowVerdict;
  verdicts?: WorkflowVerdict[];
}

/**
 * Task output graded by the suite's evaluators. `verdict` is undefined when
 * the workflow failed or no agent verdict was produced — evaluators treat
 * that as incorrect/non-conformant rather than throwing.
 */
export interface AttackDiscoveryTaskOutput {
  verdict?: WorkflowVerdict;
  workflowOutput?: WorkflowOutput;
  executionId: string;
  executionStatus: ExecutionStatus;
  traceId?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isTerminal = (status: ExecutionStatus): boolean => TerminalExecutionStatuses.includes(status);

/**
 * Reads the workflow output (`workflow.output` step) when the execution record
 * carries it.
 */
export const readWorkflowOutput = (execution: WorkflowExecutionDto): WorkflowOutput | undefined =>
  (execution as { output?: WorkflowOutput | null }).output ?? undefined;

/**
 * Scans the agent step's execution records for a structured_output verdict.
 * Each step yields multiple records (an enter record whose `output` is null,
 * plus the record carrying the result), so we scan every agent-step record —
 * enter records are skipped naturally by the null-output guard. A missing
 * verdict is reported as `undefined`, not thrown.
 */
export const readAgentVerdict = (
  stepExecutions: WorkflowStepExecutionDto[]
): WorkflowVerdict | undefined => {
  for (const step of stepExecutions.filter(isAgentStep)) {
    const output = step.output as { structured_output?: StructuredOutput } | null | undefined;
    const structured = output?.structured_output;
    const verdict = structured?.verdict ?? structured?.verdicts?.[0];
    if (verdict) {
      return verdict;
    }
  }
  return undefined;
};

/**
 * Normalizes a verdict to a canonical label from the workflow's enum
 * (`verdict` field at either the workflow-output or structured-output level,
 * with the agent's `label`/`classification` aliases kept for resilience).
 */
export const normalizeVerdictLabel = (
  task: Pick<AttackDiscoveryTaskOutput, 'verdict' | 'workflowOutput'>
): string | undefined =>
  task.workflowOutput?.verdict ??
  task.verdict?.verdict ??
  task.verdict?.label ??
  task.verdict?.classification;

/**
 * Runs the FP/TP analysis workflow for a single case payload and returns the
 * verdict plus execution metadata so evaluators can see infra failures instead
 * of throwing.
 */
export const runAttackDiscoveryWorkflow = async ({
  fetch,
  log,
  payload,
  maxWaitMs = 12 * 60_000,
  pollIntervalMs = 3_000,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  /** The corpus case payload handed to the workflow as its input event. */
  payload: Record<string, unknown>;
  maxWaitMs?: number;
  pollIntervalMs?: number;
  traceEsClient?: EsClient;
}): Promise<AttackDiscoveryTaskOutput> => {
  const { workflowExecutionId } = (await fetch(
    `/api/workflows/workflow/${FP_TP_ANALYSIS_WORKFLOW_ID}/run`,
    {
      method: 'POST',
      version: WORKFLOWS_API_VERSION,
      headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
      body: JSON.stringify({ inputs: { event: { payload } } }),
    }
  )) as { workflowExecutionId: string };

  log.info(`Started fp-tp analysis workflow execution ${workflowExecutionId} for case payload`);

  const deadline = Date.now() + maxWaitMs;
  let execution: WorkflowExecutionDto | undefined;

  while (Date.now() < deadline) {
    execution = (await fetch(`/api/workflows/executions/${workflowExecutionId}`, {
      method: 'GET',
      version: WORKFLOWS_API_VERSION,
      headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
      query: { includeOutput: true },
    })) as WorkflowExecutionDto;

    if (isTerminal(execution.status)) {
      break;
    }

    await sleep(pollIntervalMs);
  }

  if (!execution) {
    throw new Error(`No execution returned for workflow run ${workflowExecutionId}`);
  }

  if (!isTerminal(execution.status)) {
    log.warning(
      `Workflow execution ${workflowExecutionId} did not reach a terminal status within ${maxWaitMs}ms (last status: ${execution.status})`
    );
  }

  const workflowOutput = readWorkflowOutput(execution);
  const verdict = readAgentVerdict(execution.stepExecutions);
  if (!verdict && !workflowOutput?.verdict) {
    log.warning(
      `Workflow execution ${workflowExecutionId} produced no verdict (status: ${execution.status})`
    );
  }

  return {
    verdict,
    workflowOutput,
    executionId: workflowExecutionId,
    executionStatus: execution.status,
    traceId: execution.traceId,
  };
};
