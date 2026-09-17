/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';
import {
  getToolCallSteps,
  type DefaultEvaluators,
  type EvalsExecutorClient,
  type Evaluator,
  type ExperimentTask,
} from '@kbn/evals';
import type { HttpHandler } from '@kbn/core/public';
import type { AttackDiscoveryAgentBuilderChatClient } from './chat_client';
import { attackDiscoveryFixtureIndex } from './fixtures';
import type {
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput,
  AttackDiscoveryRetrievalEvidence,
  RetrievedAlertCountSource,
} from './types';
import { createAdToolResultEvaluator } from './evaluators/ad_tool_result_evaluator';
import { createAttackDiscoveryBasicEvaluator } from './evaluators/attack_discovery_basic_evaluator';
import { createAttackDiscoveryCriteriaEvaluator } from './evaluators/attack_discovery_criteria_evaluator';
import { createAttackDiscoveryRubricEvaluator } from './evaluators/attack_discovery_rubric_evaluator';
import { createCostPerAlertEvaluator } from './evaluators/cost_per_alert_evaluator';
import { createForbiddenToolsEvaluator } from './evaluators/forbidden_tools_evaluator';
import { createResponseSkillInvocationEvaluator } from './evaluators/skill_invoked_evaluator';
import { createStrictTrajectoryEvaluator } from './evaluators/trajectory_evaluator';
import { createWorkflowEvidenceEvaluator } from './evaluators/workflow_evidence_evaluator';
import { redactExecutionIds } from './redact';

type AdToolResult = NonNullable<AttackDiscoveryAgentBuilderTaskOutput['adToolResult']>;

const getNumber = (value: unknown): number | null => (typeof value === 'number' ? value : null);
const getString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const getAdStatus = (value: unknown, resultType?: string): AdToolResult['status'] => {
  if (value === 'completed' || value === 'pending') return value;
  if (resultType === 'error') return 'error';
  return null;
};

export const findAdToolResult = (
  steps: AttackDiscoveryAgentBuilderTaskOutput['steps']
): AttackDiscoveryAgentBuilderTaskOutput['adToolResult'] | undefined => {
  const adStep = steps.find((step) => step.tool_id === 'security.attack-discovery.run');
  // run_attack_discovery_tool/index.ts returns `{ data, tool_result_id, type }` — `type` is a sibling of `data`.
  const adResult = adStep?.results?.[0] as
    | { data?: Record<string, unknown>; type?: string }
    | undefined;
  const adResultData = adResult?.data;
  if (!adResultData) return undefined;

  const executionUuid =
    typeof adResultData.execution_uuid === 'string' ? adResultData.execution_uuid : undefined;

  return {
    status: getAdStatus(adResultData.status, adResult?.type),
    executionUuid,
    // `security.attack-discovery.run` (run_attack_discovery_tool/index.ts)
    // reports `alerts_context_count` from `alertRetrievalResult.alertsContextCount`
    // (run_manual_orchestration/index.ts `state.alertRetrievalResult`), which is
    // assigned AFTER the gate — the exact candidate set handed to generation as
    // `additional_alerts` (invoke_generation_workflow.ts). That is the count of
    // alerts PASSED into generation, not retrieved. See Fix 1 below for how the
    // two fields consume this differently.
    alertsContextCount: getNumber(adResultData.alerts_context_count),
    discoveryCount: getNumber(adResultData.discovery_count),
  };
};

/** The pipeline response (`get_pipeline_data.ts`), as far as this suite reads it. */
export interface AttackDiscoveryPipelineResponse {
  alert_retrieval?: Array<{
    alerts?: unknown;
    alerts_context_count?: unknown;
    extraction_strategy?: unknown;
  }> | null;
  combined_alerts?: { alerts?: unknown; alerts_context_count?: unknown } | null;
  diagnostics_context?: { config?: { alertRetrievalMode?: unknown } } | null;
  validated_discoveries?: unknown[] | null;
  workflow_executions_tracking?: Record<string, unknown> | null;
}

/**
 * A stage counts as tracked once `workflow_executions_tracking` reports a value
 * for it; the product writes `null` for phases that have not started. `stages`
 * and the persisted key booleans read this same predicate so they cannot drift.
 */
const isTrackedStage = (value: unknown): boolean => value !== null && value !== undefined;

export const trackedStages = (tracking: Record<string, unknown> | null | undefined): string[] =>
  Object.entries(tracking ?? {})
    .filter(([, value]) => isTrackedStage(value))
    .map(([stage]) => stage);

export const trackedStageKeys = (
  tracking: Record<string, unknown> | null | undefined
): Record<string, boolean> =>
  Object.fromEntries(
    Object.entries(tracking ?? {}).map(([stage, value]) => [stage, isTrackedStage(value)])
  );

/**
 * The alerts index the suite's fixtures seed, reduced to its family prefix
 * (`attackDiscoveryFixtureIndex` = `.alerts-security.alerts-default` becomes
 * `.alerts-security.alerts`) so a space-scoped sibling also matches. A query
 * against any other index is not a retrieval of the population the profile
 * expects, so it must not produce a retrieved count.
 */
export const ALERT_INDEX_FAMILY = attackDiscoveryFixtureIndex.replace(/-default$/, '');

interface AgentEsqlResult {
  /** The ES|QL text this result came from, as the result reports it (falling
   *  back to the step's own `params.query` when the result carries none). */
  query: string | null;
  /** Rows in `data.values` — the result the agent actually received. */
  rowCount: number;
}

/** Every `platform.core.execute_esql` result the agent received, in step order. */
export const collectAgentEsqlResults = (
  steps: AttackDiscoveryAgentBuilderTaskOutput['steps']
): AgentEsqlResult[] =>
  (steps ?? [])
    .filter((step) => step?.tool_id === 'platform.core.execute_esql')
    .flatMap((step) => {
      const params = (step.params ?? {}) as { query?: unknown };
      return (step.results ?? []).flatMap((raw) => {
        const entry = raw as { type?: unknown; data?: unknown } | null | undefined;
        // Recorded shape (golden, 9/9 dense reps): `results[0]` echoes the query
        // (`type: 'query'`) and `results[1]` carries the rows
        // (`type: 'esql_results'`, `data.values`). Only the latter is a result.
        if (entry?.type !== 'esql_results') return [];
        const data = (entry.data ?? {}) as { query?: unknown; values?: unknown };
        if (!Array.isArray(data.values)) return [];
        return [
          {
            query: getString(data.query) ?? getString(params.query),
            rowCount: data.values.length,
          },
        ];
      });
    });

/** Row counts of every ES|QL result the agent received (evidence, unfiltered). */
export const extractAgentEsqlRowCounts = (
  steps: AttackDiscoveryAgentBuilderTaskOutput['steps']
): number[] => collectAgentEsqlResults(steps).map((result) => result.rowCount);

/**
 * Row counts of the agent's own ALERT retrieval: the ES|QL results whose query
 * reads the alerts index. A run can execute ES|QL for other reasons — measured
 * on golden, two clean-profile reps queried
 * `logs-endpoint.events.process-default` and received 0 rows — and those are
 * not retrievals of the alert population, so they must not produce a count.
 */
export const extractAgentAlertRetrievalRowCounts = (
  steps: AttackDiscoveryAgentBuilderTaskOutput['steps']
): number[] =>
  collectAgentEsqlResults(steps)
    .filter((result) => result.query?.includes(ALERT_INDEX_FAMILY) === true)
    .map((result) => result.rowCount);

/**
 * `alert_retrieval` extraction strategies that are NOT retrievals:
 *
 * - `provided` — the route's provided-alert reconstruction, which writes the
 *   alert set the model SUPPLIED into the retrieval block
 *   (`get_pipeline_data.ts` Step 2.5, `alerts_context_count: providedAlerts.length`).
 *   That branch is unreachable at this revision; making it reachable must not
 *   turn the supplied count into a retrieved one, so the exclusion is required
 *   rather than defensive.
 * - `skill` — the gate (skill) decision run, merged into `alert_retrieval` by
 *   Step 5b with the alert set PASSED to generation.
 *
 * Reading either as "retrieved" answers "how many alerts did the model hand
 * over" instead of "how many did it retrieve".
 */
const NON_RETRIEVAL_STRATEGIES: ReadonlySet<string> = new Set(['provided', 'skill']);

const resolveRetrievedAlertCountSource = ({
  fromAlertRetrieval,
  fromCombinedAlerts,
  fromAgentRetrieval,
}: {
  fromAlertRetrieval: number | null;
  fromCombinedAlerts: number | null;
  fromAgentRetrieval: number | null;
}): RetrievedAlertCountSource => {
  if (fromAlertRetrieval != null) return 'pipeline_alert_retrieval';
  if (fromCombinedAlerts != null) return 'pipeline_combined_alerts';
  if (fromAgentRetrieval != null) return 'agent_esql_retrieval';
  return 'none';
};

// The per-workflow count (`alert_retrieval[0]`) may be missing for some
// retrieval paths (e.g. live-retrieval through the agent's own ES|QL
// tooling), so fall back to `combined_alerts.alerts_context_count`.
// `computeCombinedAlerts` (compute_combined_alerts/index.ts) sums ONLY the
// Alert-retrieval-phase results — `get_pipeline_data.ts` (Step 5) excludes
// gate entries by construction ("Combined alert retrieval view stays
// scoped to alert retrieval") — so this is a RETRIEVED count, never a
// passed one. `adToolResult.alertsContextCount` is the opposite: it comes
// from `alertRetrievalResult.alertsContextCount` assigned in
// run_manual_orchestration/index.ts AFTER the gate runs, i.e. the exact
// candidate set handed to generation as `additional_alerts` — a PASSED
// count. The two must not share a fallback (Fix 1); when no pipeline source
// has a value we fall back to the agent's own retrieval (`provided` mode
// skips retrieval by design) and, failing that, leave `retrievedAlertCount`
// `null` rather than manufacturing it from the passed count.
export const computeWorkflowAlertCounts = ({
  pipeline,
  adToolResult,
  agentAlertRetrievalRowCounts = [],
}: {
  pipeline: AttackDiscoveryPipelineResponse;
  adToolResult?: AttackDiscoveryAgentBuilderTaskOutput['adToolResult'];
  agentAlertRetrievalRowCounts?: number[];
}): {
  retrievedAlertCount: number | null;
  retrievedAlertCountSource: RetrievedAlertCountSource;
  passedAlertCount: number | null;
} => {
  const entries = pipeline.alert_retrieval ?? null;
  const retrievalEntries = (entries ?? []).filter(
    (entry) => !NON_RETRIEVAL_STRATEGIES.has(getString(entry?.extraction_strategy) ?? '')
  );
  // Every entry the response carried is a supplied/passed one, so the
  // `combined_alerts` view — built from those same entries — is a supplied
  // count too, and is not a fallback here.
  const carriesOnlyNonRetrievalEntries =
    entries != null && entries.length > 0 && retrievalEntries.length === 0;

  const fromAlertRetrieval = getNumber(retrievalEntries[0]?.alerts_context_count);
  const fromCombinedAlerts = carriesOnlyNonRetrievalEntries
    ? null
    : getNumber(pipeline.combined_alerts?.alerts_context_count);
  // The profile asks whether the agent's retrieval reached the seeded
  // population, so among the agent's own alert retrievals the LARGEST observed
  // population is the one to compare against `expectedRetrievedAlertCount`.
  const fromAgentRetrieval =
    agentAlertRetrievalRowCounts.length > 0 ? Math.max(...agentAlertRetrievalRowCounts) : null;

  return {
    retrievedAlertCount: fromAlertRetrieval ?? fromCombinedAlerts ?? fromAgentRetrieval,
    retrievedAlertCountSource: resolveRetrievedAlertCountSource({
      fromAlertRetrieval,
      fromCombinedAlerts,
      fromAgentRetrieval,
    }),
    passedAlertCount: adToolResult?.alertsContextCount ?? null,
  };
};

/**
 * The pipeline-response facts behind the counts above, persisted on the task
 * output so the next `null` is diagnosable from the record instead of from the
 * product source. Purely additive: no evaluator reads it to score, and no raw
 * alert text or execution id is copied (only counts, strategy names and stage
 * booleans).
 */
export const extractRetrievalEvidence = ({
  pipeline,
  agentEsqlRowCounts = [],
}: {
  pipeline?: AttackDiscoveryPipelineResponse | null;
  agentEsqlRowCounts?: number[];
}): AttackDiscoveryRetrievalEvidence => {
  const entries = pipeline?.alert_retrieval;
  const combined = pipeline?.combined_alerts ?? null;

  return {
    alertRetrievalMode: getString(pipeline?.diagnostics_context?.config?.alertRetrievalMode),
    pipelineAlertRetrieval: Array.isArray(entries)
      ? entries.map((entry) => ({
          alertsContextCount: getNumber(entry?.alerts_context_count),
          extractionStrategy: getString(entry?.extraction_strategy),
          alertsCount: Array.isArray(entry?.alerts) ? entry.alerts.length : null,
        }))
      : null,
    pipelineCombinedAlerts:
      combined == null
        ? null
        : {
            alertsContextCount: getNumber(combined.alerts_context_count),
            alertsCount: Array.isArray(combined.alerts) ? combined.alerts.length : null,
          },
    workflowExecutionsTrackingKeys: trackedStageKeys(pipeline?.workflow_executions_tracking),
    agentEsqlRowCounts,
  };
};

/**
 * The task output's `workflow` block: the pipeline response when there is one,
 * and the agent's own retrieval when there is not — a `provided`-mode run has
 * no pipeline count by design, which is exactly the case the recorded steps
 * answer.
 */
export const buildWorkflow = ({
  pipeline,
  adToolResult,
  agentEsqlRowCounts,
  agentAlertRetrievalRowCounts,
}: {
  pipeline: AttackDiscoveryPipelineResponse | null;
  adToolResult?: AttackDiscoveryAgentBuilderTaskOutput['adToolResult'];
  agentEsqlRowCounts: number[];
  agentAlertRetrievalRowCounts: number[];
}): AttackDiscoveryAgentBuilderTaskOutput['workflow'] => {
  const { retrievedAlertCount, retrievedAlertCountSource, passedAlertCount } =
    computeWorkflowAlertCounts({
      pipeline: pipeline ?? {},
      adToolResult,
      agentAlertRetrievalRowCounts,
    });

  return {
    stages: trackedStages(pipeline?.workflow_executions_tracking),
    retrievedAlertCount,
    retrievedAlertCountSource,
    passedAlertCount,
    validatedDiscoveryCount: Array.isArray(pipeline?.validated_discoveries)
      ? pipeline.validated_discoveries.length
      : adToolResult?.discoveryCount ?? null,
    retrievalEvidence: extractRetrievalEvidence({ pipeline, agentEsqlRowCounts }),
  };
};

const inspectWorkflow = async ({
  fetch,
  executionId,
  adToolResult,
  agentEsqlRowCounts,
  agentAlertRetrievalRowCounts,
}: {
  fetch: HttpHandler;
  executionId: string;
  adToolResult?: AttackDiscoveryAgentBuilderTaskOutput['adToolResult'];
  agentEsqlRowCounts: number[];
  agentAlertRetrievalRowCounts: number[];
}): Promise<AttackDiscoveryAgentBuilderTaskOutput['workflow']> => {
  const tracking = (await fetch(`/internal/attack_discovery/executions/${executionId}/tracking`, {
    method: 'GET',
    headers: { 'elastic-api-version': '1' },
  })) as { generation?: { workflow_id?: string } | null };
  const workflowId = tracking.generation?.workflow_id;
  const pipeline = workflowId
    ? ((await fetch(`/internal/attack_discovery/workflow/${workflowId}/execution/${executionId}`, {
        method: 'GET',
        headers: { 'elastic-api-version': '1' },
      })) as AttackDiscoveryPipelineResponse)
    : null;

  // Without a generation workflow there is no pipeline response to read, but the
  // agent's own retrieval (recorded in `steps`) is still observable — which is
  // the whole point of `buildWorkflow` taking a nullable pipeline.
  return buildWorkflow({
    pipeline,
    adToolResult,
    agentEsqlRowCounts,
    agentAlertRetrievalRowCounts,
  });
};

const buildTask =
  ({
    chatClient,
    fetch,
  }: {
    chatClient: AttackDiscoveryAgentBuilderChatClient;
    fetch: HttpHandler;
  }): ExperimentTask<AttackDiscoveryAgentBuilderExample, AttackDiscoveryAgentBuilderTaskOutput> =>
  async ({ input }) => {
    const response = await chatClient.converse(
      input?.question ?? '',
      input?.attachments,
      input?.expectedSkills
    );
    const adToolResult = findAdToolResult(response.steps);
    // The agent's own retrieval, read from the recorded steps: in `provided`
    // mode this is the only observable retrieval source (the pipeline skips the
    // retrieval phase by design, so its response carries no retrieved count).
    const agentEsqlRowCounts = extractAgentEsqlRowCounts(response.steps);
    const agentAlertRetrievalRowCounts = extractAgentAlertRetrievalRowCounts(response.steps);
    const executionId = adToolResult?.executionUuid;
    const workflow = executionId
      ? await inspectWorkflow({
          fetch,
          executionId,
          adToolResult,
          agentEsqlRowCounts,
          agentAlertRetrievalRowCounts,
        })
      : buildWorkflow({
          pipeline: null,
          adToolResult,
          agentEsqlRowCounts,
          agentAlertRetrievalRowCounts,
        });
    return {
      ...response,
      // Redact transient execution UUIDs from steps and adToolResult before
      // they reach evaluators — these are per-run values that would pollute
      // score reports and make diff comparisons noisy.
      steps: redactExecutionIds(response.steps) as typeof response.steps,
      adToolResult: adToolResult
        ? {
            status: adToolResult.status,
            executionUuid: undefined,
            alertsContextCount: adToolResult.alertsContextCount,
            discoveryCount: adToolResult.discoveryCount,
          }
        : undefined,
      workflow,
    };
  };

export const createEvaluateAttackDiscoveryAgentBuilderDataset =
  ({
    chatClient,
    fetch,
    evaluators,
    executorClient,
    traceEsClient,
  }: {
    chatClient: AttackDiscoveryAgentBuilderChatClient;
    fetch: HttpHandler;
    evaluators: DefaultEvaluators;
    executorClient: EvalsExecutorClient;
    traceEsClient: EsClient;
  }) =>
  async ({
    dataset,
  }: {
    dataset: { name: string; description: string; examples: AttackDiscoveryAgentBuilderExample[] };
  }) => {
    const trajectory = createStrictTrajectoryEvaluator({
      extractToolCalls: (output) =>
        getToolCallSteps(output)
          .map((step) => step.tool_id)
          .filter(Boolean) as string[],
      goldenPathExtractor: (expected) =>
        (expected as { expectedToolPath?: string[] })?.expectedToolPath ?? [],
    });
    const traceEvaluators = evaluators.traceBasedEvaluators;
    await executorClient.runExperiment(
      { datasets: [dataset], task: buildTask({ chatClient, fetch }) },
      [
        createAdToolResultEvaluator(),
        createWorkflowEvidenceEvaluator(),
        trajectory,
        createForbiddenToolsEvaluator(),
        createCostPerAlertEvaluator(),
        createAttackDiscoveryBasicEvaluator(),
        createAttackDiscoveryCriteriaEvaluator({ evaluators }) as Evaluator<
          AttackDiscoveryAgentBuilderExample,
          AttackDiscoveryAgentBuilderTaskOutput
        >,
        createAttackDiscoveryRubricEvaluator({ evaluators }) as Evaluator<
          AttackDiscoveryAgentBuilderExample,
          AttackDiscoveryAgentBuilderTaskOutput
        >,
        traceEvaluators.toolCalls as Evaluator<
          AttackDiscoveryAgentBuilderExample,
          AttackDiscoveryAgentBuilderTaskOutput
        >,
        traceEvaluators.latency as Evaluator<
          AttackDiscoveryAgentBuilderExample,
          AttackDiscoveryAgentBuilderTaskOutput
        >,
        traceEvaluators.inputTokens as Evaluator<
          AttackDiscoveryAgentBuilderExample,
          AttackDiscoveryAgentBuilderTaskOutput
        >,
        traceEvaluators.outputTokens as Evaluator<
          AttackDiscoveryAgentBuilderExample,
          AttackDiscoveryAgentBuilderTaskOutput
        >,
        createResponseSkillInvocationEvaluator() as Evaluator<
          AttackDiscoveryAgentBuilderExample,
          AttackDiscoveryAgentBuilderTaskOutput
        >,
      ]
    );
  };
