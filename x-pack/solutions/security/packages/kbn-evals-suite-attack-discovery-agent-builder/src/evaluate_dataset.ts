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
import type {
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput,
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
// count. The two must not share a fallback (Fix 1); when neither pipeline
// source has a value we leave `retrievedAlertCount` `null` rather than
// manufacturing it from the passed count.
export const computeWorkflowAlertCounts = ({
  pipeline,
  adToolResult,
}: {
  pipeline: {
    alert_retrieval?: Array<{ alerts_context_count?: number }> | null;
    combined_alerts?: { alerts_context_count?: number } | null;
  };
  adToolResult?: AttackDiscoveryAgentBuilderTaskOutput['adToolResult'];
}): { retrievedAlertCount: number | null; passedAlertCount: number | null } => ({
  retrievedAlertCount:
    getNumber(pipeline.alert_retrieval?.[0]?.alerts_context_count) ??
    getNumber(pipeline.combined_alerts?.alerts_context_count),
  passedAlertCount: adToolResult?.alertsContextCount ?? null,
});

const inspectWorkflow = async ({
  fetch,
  executionId,
  adToolResult,
}: {
  fetch: HttpHandler;
  executionId: string;
  adToolResult?: AttackDiscoveryAgentBuilderTaskOutput['adToolResult'];
}): Promise<AttackDiscoveryAgentBuilderTaskOutput['workflow']> => {
  const tracking = (await fetch(`/internal/attack_discovery/executions/${executionId}/tracking`, {
    method: 'GET',
    headers: { 'elastic-api-version': '1' },
  })) as { generation?: { workflow_id?: string } | null };
  const workflowId = tracking.generation?.workflow_id;
  if (!workflowId) {
    return {
      stages: [],
      // adToolResult.alertsContextCount is the PASSED count (see findAdToolResult
      // above); it must not also stand in for retrievedAlertCount (Fix 1).
      retrievedAlertCount: null,
      passedAlertCount: adToolResult?.alertsContextCount ?? null,
      validatedDiscoveryCount: adToolResult?.discoveryCount ?? null,
    };
  }
  const pipeline = (await fetch(
    `/internal/attack_discovery/workflow/${workflowId}/execution/${executionId}`,
    { method: 'GET', headers: { 'elastic-api-version': '1' } }
  )) as {
    alert_retrieval?: Array<{ alerts_context_count?: number }> | null;
    combined_alerts?: { alerts_context_count?: number } | null;
    validated_discoveries?: unknown[] | null;
    workflow_executions_tracking?: Record<string, unknown>;
  };
  const stages = Object.entries(pipeline.workflow_executions_tracking ?? {})
    .filter(([, value]) => value !== null)
    .map(([stage]) => stage);

  const { retrievedAlertCount, passedAlertCount } = computeWorkflowAlertCounts({
    pipeline,
    adToolResult,
  });
  return {
    stages,
    retrievedAlertCount,
    passedAlertCount,
    validatedDiscoveryCount: Array.isArray(pipeline.validated_discoveries)
      ? pipeline.validated_discoveries.length
      : adToolResult?.discoveryCount ?? null,
  };
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
    const executionId = adToolResult?.executionUuid;
    const workflow = executionId
      ? await inspectWorkflow({ fetch, executionId, adToolResult })
      : {
          stages: [],
          retrievedAlertCount: null,
          passedAlertCount: adToolResult?.alertsContextCount ?? null,
          validatedDiscoveryCount: adToolResult?.discoveryCount ?? null,
        };
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
