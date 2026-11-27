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
  TerminalExecutionStatuses,
  type ExecutionStatus,
  type WorkflowExecutionDto,
  type WorkflowStepExecutionDto,
} from '@kbn/workflows';
import {
  AGENT_BUILDER_API_VERSION,
  AGENT_BUILDER_CONVERSATIONS_ROUTE,
  ALERT_ANALYSIS_WORKFLOW_ID,
  WORKFLOWS_API_VERSION,
  type Classification,
} from './constants';

/**
 * The step in alert_analysis_workflow.yaml whose structured output we grade: `ai.agent` when the
 * space classifies with an agent, `ai.prompt` when it classifies with a prompt. We match on
 * `stepType` rather than the step's name so the harness survives step renames in the workflow
 * definition (the agent step has been called both `onechat_runAgent_step` and `runAgent_step`).
 * The name list is a fallback for execution records that omit `stepType`.
 */
const CLASSIFICATION_STEP_TYPES = ['ai.agent', 'ai.prompt'];
const CLASSIFICATION_STEP_ID_FALLBACKS = [
  'runAgent_step',
  'onechat_runAgent_step',
  'runPrompt_step',
];

const isClassificationStep = (step: WorkflowStepExecutionDto): boolean =>
  (step.stepType !== undefined && CLASSIFICATION_STEP_TYPES.includes(step.stepType)) ||
  (step.stepType === undefined && CLASSIFICATION_STEP_ID_FALLBACKS.includes(step.stepId));

/** One verdict, as the workflow's classification step is schema-constrained to return it. */
interface Verdict {
  /**
   * Alert id the model echoes back. The agent schema names this `id` (matched in
   * `apply_verdicts` via `where: 'id'`). Do not fall back to `alert_id` — that field is only
   * introduced later when building caller-facing `output_verdicts`, and production pairing
   * ignores it.
   */
  id?: string;
  classification?: Classification;
  confidence_score?: number;
  rationale?: string;
  contributing_factors?: string[];
}

/**
 * The classification step classifies a whole batch of alerts per call, so its structured output
 * carries a `verdicts` array. The agent step returns it as `structured_output`, the prompt step as
 * `content`.
 */
interface StructuredOutput {
  verdicts?: Verdict[];
}

interface ClassificationStepOutput {
  structured_output?: StructuredOutput;
  content?: StructuredOutput;
}

/**
 * Task output graded by the suite's evaluators. `classification` is undefined when the
 * workflow failed or the agent step did not produce a verdict — the evaluators treat that
 * as an invalid/incorrect verdict rather than throwing.
 */
export interface AlertAnalysisVerdict {
  classification?: Classification;
  confidenceScore?: number;
  rationale?: string;
  contributingFactors?: string[];
  executionId: string;
  executionStatus: ExecutionStatus;
  /** What classified the alerts: the space's agent or a single prompt. */
  classificationMethod: ClassificationMethod;
  traceId?: string;
  /** Ordered agent tool IDs from OTel TOOL spans on the workflow execution trace. */
  toolCallIds?: string[];
  /** True when trace ES was unreachable or the workflow trace id was invalid. */
  toolCallsUnavailable?: boolean;
  /** Agent Builder conversations the agent step stored for this run (agent method only). */
  conversationIds?: string[];
  /** Subset of `conversationIds` whose best-effort delete failed, for the spec's final sweep. */
  undeletedConversationIds?: string[];
}

export type ClassificationMethod = 'agent' | 'prompt';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isTerminal = (status: ExecutionStatus): boolean => TerminalExecutionStatuses.includes(status);

/**
 * Reads the verdict for `alertId` out of the classification step's output. Each step yields
 * multiple execution records (an enter record whose `output` is null and the record that carries
 * the result), and both report status `completed`, so we cannot key off status alone: scan every
 * classification-step record and return the first verdict we find for the alert.
 *
 * The agent schema keys the alert as `id` (see alert_analysis_workflow.yaml); `apply_verdicts`
 * pairs on the same field. Match only `id` so eval accuracy tracks production pairing.
 *
 * We seed one alert per run, so the batch the workflow builds holds exactly that alert; the id is
 * still matched explicitly rather than taking `verdicts[0]`, so a run that somehow classified a
 * different alert is reported as "no verdict" instead of being graded against the wrong alert.
 */
export const readVerdict = (
  stepExecutions: WorkflowStepExecutionDto[],
  alertId: string
): Verdict | undefined => {
  const classificationSteps = stepExecutions.filter(isClassificationStep);
  for (const step of classificationSteps) {
    const output = step.output as ClassificationStepOutput | null | undefined;
    const verdicts = output?.structured_output?.verdicts ?? output?.content?.verdicts;
    const verdict = verdicts?.find(({ id }) => id === alertId);
    if (verdict?.classification) {
      return verdict;
    }
  }
  return undefined;
};

/** The `data.set` step that keeps only a batch's own alert ids (alert_analysis_workflow.yaml). */
const BATCH_FILTER_STEP_ID = 'filter_verdicts_to_batch';

/**
 * Every verdict the workflow accepted, keyed by alert id. Read from the batch filter's output
 * rather than the classification replies: a reply can echo an id from another batch, which
 * production drops, so grading the raw replies could credit an alert whose own batch returned
 * nothing. A run with no filter step record yields no verdicts, which the evaluators score as a miss.
 */
export const readVerdicts = (stepExecutions: WorkflowStepExecutionDto[]): Map<string, Verdict> => {
  const byId = new Map<string, Verdict>();
  for (const step of stepExecutions.filter(({ stepId }) => stepId === BATCH_FILTER_STEP_ID)) {
    const { batch_verdicts: verdicts } = (step.output ?? {}) as { batch_verdicts?: Verdict[] };
    for (const verdict of verdicts ?? []) {
      if (verdict.id && verdict.classification && !byId.has(verdict.id)) {
        byId.set(verdict.id, verdict);
      }
    }
  }
  return byId;
};

/**
 * Best-effort delete of the conversations a run stored. A failure is logged and never thrown, so
 * cleanup can't fail an example. Returns the ids that could not be deleted.
 */
export const deleteConversations = async ({
  fetch,
  log,
  conversationIds,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  conversationIds: string[];
}): Promise<string[]> => {
  const failed: string[] = [];
  for (const id of conversationIds) {
    try {
      await fetch(`${AGENT_BUILDER_CONVERSATIONS_ROUTE}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        version: AGENT_BUILDER_API_VERSION,
        headers: { 'elastic-api-version': AGENT_BUILDER_API_VERSION },
      });
    } catch (error) {
      failed.push(id);
      log.warning(
        `Could not delete agent conversation ${id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
  return failed;
};

/** Deletes conversations of the last readable execution. Never throws. */
const cleanUpAfterFailure = async ({
  fetchExecution,
  lastSeen,
  fetch,
  log,
}: {
  fetchExecution: () => Promise<WorkflowExecutionDto>;
  lastSeen?: WorkflowExecutionDto;
  fetch: HttpHandler;
  log: ToolingLog;
}): Promise<void> => {
  try {
    const latest = await fetchExecution().catch(() => lastSeen);
    const conversationIds = extractAgentConversationIds(latest?.stepExecutions ?? []).map(
      ({ conversationId }) => conversationId
    );
    if (conversationIds.length > 0) {
      await deleteConversations({ fetch, log, conversationIds });
    }
  } catch (cleanupError) {
    log.warning(
      `Conversation cleanup after a workflow failure failed: ${
        cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
      }`
    );
  }
};

/** Triggers the workflow for `alertIds` through the `alert` trigger and polls until it finishes. */
const startAndWait = async ({
  fetch,
  log,
  alertIds,
  alertIndex,
  maxWaitMs,
  pollIntervalMs,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  alertIds: string[];
  alertIndex: string;
  maxWaitMs: number;
  pollIntervalMs: number;
}): Promise<{ workflowExecutionId: string; execution: WorkflowExecutionDto }> => {
  const { workflowExecutionId } = (await fetch(
    `/api/workflows/workflow/${ALERT_ANALYSIS_WORKFLOW_ID}/run`,
    {
      method: 'POST',
      version: WORKFLOWS_API_VERSION,
      headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
      body: JSON.stringify({
        inputs: {
          event: {
            triggerType: 'alert',
            alertIds: alertIds.map((_id) => ({ _id, _index: alertIndex })),
          },
        },
      }),
    }
  )) as { workflowExecutionId: string };

  log.info(
    `Started alert-analysis workflow execution ${workflowExecutionId} for ${alertIds.length} alert(s)`
  );

  const deadline = Date.now() + maxWaitMs;
  let execution: WorkflowExecutionDto | undefined;

  const fetchExecution = () =>
    fetch(`/api/workflows/executions/${workflowExecutionId}`, {
      method: 'GET',
      version: WORKFLOWS_API_VERSION,
      headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
      query: { includeOutput: true },
    }) as Promise<WorkflowExecutionDto>;

  try {
    while (Date.now() < deadline) {
      execution = await fetchExecution();

      if (isTerminal(execution.status)) {
        break;
      }

      await sleep(pollIntervalMs);
    }

    if (!execution) {
      throw new Error(`No execution returned for workflow run ${workflowExecutionId}`);
    }
  } catch (error) {
    // The caller never sees the execution, so conversations the agent step already stored would
    // leak. Read them back best-effort and delete them; the original error is rethrown unchanged.
    // A step that stores its conversation after this point is not covered.
    await cleanUpAfterFailure({ fetchExecution, lastSeen: execution, fetch, log });
    throw error;
  }

  if (!isTerminal(execution.status)) {
    log.warning(
      `Workflow execution ${workflowExecutionId} did not reach a terminal status within ${maxWaitMs}ms (last status: ${execution.status})`
    );
  }

  return { workflowExecutionId, execution };
};

const readAgentToolCalls = async ({
  traceEsClient,
  log,
  workflowExecutionId,
  conversationIds,
}: {
  traceEsClient?: EsClient;
  log: ToolingLog;
  workflowExecutionId: string;
  conversationIds: string[];
}) => {
  const result = await readAgentToolCallsFromTraces({ traceEsClient, conversationIds, log });

  if (result.unavailable) {
    log.warning(
      `Agent tool calls unavailable for execution ${workflowExecutionId} ` +
        `(conversation ids: ${conversationIds.length > 0 ? conversationIds.join(', ') : 'none'})`
    );
  }
  return result;
};

/**
 * Runs the managed alert-analysis workflow end-to-end for a single seeded alert and
 * returns the verdict of the classification step (agent or prompt, per the space's settings).
 *
 * Uses the production `alert` trigger path: passing `triggerType: 'alert'` + `alertIds`
 * makes the run route fetch the alert from ES and build the standardized event
 * (see `preprocessAlertInputs`), exactly as the `.workflows` rule connector does.
 */
export const runAlertAnalysisWorkflow = async ({
  fetch,
  log,
  traceEsClient,
  alertId,
  alertIndex,
  classificationMethod,
  maxWaitMs = 12 * 60_000,
  pollIntervalMs = 3_000,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  traceEsClient?: EsClient;
  alertId: string;
  alertIndex: string;
  /** What the space is configured to classify with; decides whether agent tool calls are read. */
  classificationMethod: ClassificationMethod;
  maxWaitMs?: number;
  pollIntervalMs?: number;
}): Promise<AlertAnalysisVerdict> => {
  const { workflowExecutionId, execution } = await startAndWait({
    fetch,
    log,
    alertIds: [alertId],
    alertIndex,
    maxWaitMs,
    pollIntervalMs,
  });

  const structured = readVerdict(execution.stepExecutions, alertId);

  if (!structured?.classification) {
    log.warning(
      `Workflow execution ${workflowExecutionId} produced no classification (status: ${execution.status})`
    );
  }

  // A prompt has no agent conversation and makes no tool calls, so there is nothing to read.
  const conversationIds =
    classificationMethod === 'agent'
      ? extractAgentConversationIds(execution.stepExecutions).map(
          ({ conversationId }) => conversationId
        )
      : undefined;

  let toolCallIds: string[] | undefined;
  let unavailable: boolean | undefined;
  let undeletedConversationIds: string[] | undefined;
  try {
    if (conversationIds) {
      ({ toolCallIds, unavailable } = await readAgentToolCalls({
        traceEsClient,
        log,
        workflowExecutionId,
        conversationIds,
      }));
    }
  } finally {
    // The trace read keys on the conversation id only, so the conversation can go once it is done.
    if (conversationIds && conversationIds.length > 0) {
      undeletedConversationIds = await deleteConversations({ fetch, log, conversationIds });
    }
  }

  return {
    classification: structured?.classification,
    confidenceScore: structured?.confidence_score,
    rationale: structured?.rationale,
    contributingFactors: structured?.contributing_factors,
    executionId: workflowExecutionId,
    executionStatus: execution.status,
    classificationMethod,
    traceId: execution.traceId,
    toolCallIds,
    toolCallsUnavailable: unavailable,
    conversationIds,
    undeletedConversationIds,
  };
};

/** Verdicts of one batched workflow run, keyed by the alert ids that were seeded. */
export interface AlertAnalysisBatchResult {
  verdicts: Record<string, { classification?: Classification; confidenceScore?: number }>;
  executionId: string;
  executionStatus: ExecutionStatus;
}

/** Runs the workflow once over all `alertIds` (it splits them into model calls of up to 50). */
export const runAlertAnalysisBatch = async ({
  fetch,
  log,
  alertIds,
  alertIndex,
  maxWaitMs = 30 * 60_000,
  pollIntervalMs = 5_000,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  alertIds: string[];
  alertIndex: string;
  maxWaitMs?: number;
  pollIntervalMs?: number;
}): Promise<AlertAnalysisBatchResult> => {
  const { workflowExecutionId, execution } = await startAndWait({
    fetch,
    log,
    alertIds,
    alertIndex,
    maxWaitMs,
    pollIntervalMs,
  });
  const found = readVerdicts(execution.stepExecutions);
  const verdicts: AlertAnalysisBatchResult['verdicts'] = {};
  for (const id of alertIds) {
    const verdict = found.get(id);
    if (verdict) {
      verdicts[id] = {
        classification: verdict.classification,
        confidenceScore: verdict.confidence_score,
      };
    }
  }
  return { verdicts, executionId: workflowExecutionId, executionStatus: execution.status };
};
