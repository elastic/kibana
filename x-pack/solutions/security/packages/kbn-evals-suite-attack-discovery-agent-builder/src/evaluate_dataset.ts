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
import { createAttackDiscoveryBasicEvaluator } from './evaluators/attack_discovery_basic_evaluator';
import { createAttackDiscoveryCriteriaEvaluator } from './evaluators/attack_discovery_criteria_evaluator';
import { createAttackDiscoveryRubricEvaluator } from './evaluators/attack_discovery_rubric_evaluator';
import { createCostPerAlertEvaluator } from './evaluators/cost_per_alert_evaluator';
import { createForbiddenToolsEvaluator } from './evaluators/forbidden_tools_evaluator';
import { redactExecutionIds } from './redact';

type AdToolResult = NonNullable<AttackDiscoveryAgentBuilderTaskOutput['adToolResult']>;

const getNumber = (value: unknown): number | null => (typeof value === 'number' ? value : null);

const getAdStatus = (value: unknown, resultType?: string): AdToolResult['status'] => {
  if (value === 'completed' || value === 'pending') return value;
  if (resultType === 'error') return 'error';
  return null;
};

const findAdToolResult = (
  steps: AttackDiscoveryAgentBuilderTaskOutput['steps']
): AttackDiscoveryAgentBuilderTaskOutput['adToolResult'] | undefined => {
  const adStep = steps.find((step) => step.tool_id === 'security.attack-discovery.run');
  const adResultData = (adStep?.results?.[0] as { data?: Record<string, unknown> } | undefined)
    ?.data;
  if (!adResultData) return undefined;

  const executionUuid =
    typeof adResultData.execution_uuid === 'string' ? adResultData.execution_uuid : undefined;

  return {
    status: getAdStatus(adResultData.status, adResultData.type as string),
    executionUuid,
    alertsContextCount: getNumber(adResultData.alerts_context_count),
    discoveryCount: getNumber(adResultData.discovery_count),
  };
};

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
      retrievedAlertCount: adToolResult?.alertsContextCount ?? null,
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

  // The pipeline endpoint may not surface a per-workflow retrieved alert count
  // for all retrieval paths (e.g. live-retrieval through the agent's own ES|QL
  // tooling). The run tool result carries the authoritative alerts_context_count,
  // so we fall back to it when the pipeline doesn't provide the count.
  const pipelineRetrievedCount = getNumber(pipeline.alert_retrieval?.[0]?.alerts_context_count);
  const pipelinePassedCount = getNumber(pipeline.combined_alerts?.alerts_context_count);
  return {
    stages,
    retrievedAlertCount: pipelineRetrievedCount ?? adToolResult?.alertsContextCount ?? null,
    passedAlertCount: pipelinePassedCount ?? adToolResult?.alertsContextCount ?? null,
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
          retrievedAlertCount: adToolResult?.alertsContextCount ?? null,
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

const createAdToolResultEvaluator = (): Evaluator<
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput
> => ({
  name: 'AdToolResult',
  kind: 'CODE',
  evaluate: async ({ output }) => {
    const status = output.adToolResult?.status ?? null;
    const discoveryCount = output.adToolResult?.discoveryCount ?? null;
    const success = status === 'completed' && discoveryCount != null && discoveryCount > 0;

    return {
      score: success ? 1 : 0,
      metadata: {
        status,
        discoveryCount,
      },
    };
  },
});

const createWorkflowEvidenceEvaluator = (): Evaluator<
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput
> => ({
  name: 'WorkflowEvidence',
  kind: 'CODE',
  evaluate: async ({ output, expected }) => {
    const expectedStages = expected?.expectedWorkflowStages ?? [];
    const stages = output.workflow.stages;
    const expectedRetrievedAlertCount = expected?.expectedRetrievedAlertCount;
    const expectedPassedAlertCount = expected?.expectedPassedAlertCount;

    const retrievedCountAvailable =
      expectedRetrievedAlertCount == null || output.workflow.retrievedAlertCount !== null;
    const passedCountAvailable =
      expectedPassedAlertCount != null && output.workflow.passedAlertCount !== null;
    const hasCompleteWorkflowEvidence = retrievedCountAvailable && passedCountAvailable;

    const stagesMatch = expectedStages.every((stage) => stages.includes(stage));
    const retrievedCountMatches =
      expectedRetrievedAlertCount == null ||
      output.workflow.retrievedAlertCount === expectedRetrievedAlertCount;
    const passedCountMatches = output.workflow.passedAlertCount === expectedPassedAlertCount;
    const matchesExpectedWorkflow = stagesMatch && retrievedCountMatches && passedCountMatches;

    return {
      score: hasCompleteWorkflowEvidence ? Number(matchesExpectedWorkflow) : undefined,
      metadata: {
        evidenceState: hasCompleteWorkflowEvidence ? 'complete' : 'incomplete',
        stages,
        expectedRetrievedAlertCount,
        expectedPassedAlertCount,
        retrievedAlertCount: output.workflow.retrievedAlertCount,
        passedAlertCount: output.workflow.passedAlertCount,
        validatedDiscoveryCount: output.workflow.validatedDiscoveryCount,
      },
    };
  },
});

const isString = (value: unknown): value is string => typeof value === 'string';

interface ToolCallStep {
  tool_id?: string;
  results?: unknown[];
  params?: Record<string, unknown>;
}

const getToolCallStepsWithParams = (
  output: AttackDiscoveryAgentBuilderTaskOutput
): ToolCallStep[] =>
  (output.steps ?? [])
    .filter((step) => (step as { type?: string }).type === 'tool_call')
    .map((step) => ({
      tool_id: step.tool_id,
      results: step.results,
      params: (step as { params?: Record<string, unknown> }).params,
    }));

const extractSkillNamesFromLoadSkillStep = (step: ToolCallStep): string[] => {
  const names: string[] = [];
  if (step.tool_id !== 'load_skill') return names;

  const skillParam = step.params?.skill;
  if (isString(skillParam)) names.push(skillParam);

  for (const result of step.results ?? []) {
    const data = (result as { data?: { skill?: { id?: string; name?: string } } } | undefined)
      ?.data;
    if (isString(data?.skill?.id)) names.push(data.skill.id);
    if (isString(data?.skill?.name)) names.push(data.skill.name);
  }

  return names;
};

const createStrictTrajectoryEvaluator = ({
  extractToolCalls,
  goldenPathExtractor,
}: {
  extractToolCalls: (output: AttackDiscoveryAgentBuilderTaskOutput) => string[];
  goldenPathExtractor: (expected: unknown) => string[];
}): Evaluator<AttackDiscoveryAgentBuilderExample, AttackDiscoveryAgentBuilderTaskOutput> => ({
  name: 'trajectory',
  kind: 'CODE',
  evaluate: async ({ output, expected }) => {
    const actual = extractToolCalls(output);
    const expectedPath = goldenPathExtractor(expected);

    if (expectedPath.length === 0) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'No expected tool path defined for this example.',
      };
    }

    let expectedIndex = 0;
    for (const tool of actual) {
      if (tool === expectedPath[expectedIndex]) {
        expectedIndex++;
        if (expectedIndex === expectedPath.length) break;
      }
    }

    if (expectedIndex !== expectedPath.length) {
      return {
        score: 0,
        explanation: `Expected path [${expectedPath.join(
          ' -> '
        )}] not found in actual path [${actual.join(' -> ')}].`,
        metadata: { actualPath: actual, expectedPath },
      };
    }

    // Natural routing always pays a load_skill call; exclude it from precision scoring.
    const precisionDenominator = actual.filter((tool) => tool !== 'load_skill').length;
    const score = expectedPath.length / Math.max(precisionDenominator, expectedPath.length);
    return {
      score,
      explanation: `Expected path found in order. ${
        actual.length
      } total tool calls (${precisionDenominator} excluding load_skill), ${
        expectedPath.length
      } expected. Precision: ${score.toFixed(3)}.`,
      metadata: { actualPath: actual, expectedPath, precisionDenominator },
    };
  },
});

const createResponseSkillInvocationEvaluator = ({
  expectedSkills,
}: {
  expectedSkills: string[];
}): Evaluator<AttackDiscoveryAgentBuilderExample, AttackDiscoveryAgentBuilderTaskOutput> => ({
  name: `Skill Invoked (${expectedSkills.join(', ')})`,
  kind: 'CODE',
  evaluate: async ({ output }) => {
    if (expectedSkills.length === 0) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'No expected skills defined for this example.',
      };
    }

    const toolCalls = getToolCallStepsWithParams(output);
    const invokedSkillNames = new Set(
      toolCalls.flatMap((step) => extractSkillNamesFromLoadSkillStep(step))
    );
    const invoked = Array.from(invokedSkillNames);

    const matched = expectedSkills.filter((expected) =>
      invoked.some(
        (name) =>
          name.toLowerCase().includes(expected.toLowerCase()) ||
          expected.toLowerCase().includes(name.toLowerCase())
      )
    );

    if (matched.length === 0) {
      return {
        score: 0,
        explanation: `Expected skill(s) not loaded. Invoked: ${invoked.join(', ') || 'none'}.`,
      };
    }

    return {
      score: 1,
      explanation: `Expected skill(s) loaded: ${matched.join(', ')}.`,
      metadata: { invokedSkills: invoked },
    };
  },
});

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
    const skillNames = [
      ...new Set(dataset.examples.flatMap((example) => example.input?.expectedSkills ?? [])),
    ];
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
        createResponseSkillInvocationEvaluator({ expectedSkills: skillNames }) as Evaluator<
          AttackDiscoveryAgentBuilderExample,
          AttackDiscoveryAgentBuilderTaskOutput
        >,
      ]
    );
  };
