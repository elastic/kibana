/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import {
  createQuantitativeCorrectnessEvaluators,
  createSkillInvocationEvaluator,
  buildSkillInvokedCaseExpression,
  createTrajectoryEvaluator,
  getStringMeta,
  getToolCallSteps,
  type DefaultEvaluators,
  type EvalsExecutorClient,
  type EvaluationDataset,
  type Evaluator,
  type Example,
  type ExperimentTask,
  type TaskOutput,
  withEvaluatorSpan,
} from '@kbn/evals';
import { isInternalTool } from '@kbn/agent-builder-common/tools';
import type { ToolingLog } from '@kbn/tooling-log';
import type { SecuritySkillsExample } from './dataset';
import type { SecuritySkillsAgentBuilderChatClient } from './chat_client';

export interface SecuritySkillsDatasetInput extends Record<string, unknown> {
  question: string;
}

export interface SecuritySkillsDatasetExpected {
  reference: string;
  expected: string;
  expectedSkill?: string;
  shouldNotActivateSkill?: string;
  tool_sequence?: string[];
}

export interface SecuritySkillsDatasetMetadata extends Record<string, unknown> {
  category: string;
  query_intent: string;
  dataset_split: string[];
  is_distractor?: boolean;
  expectedToolId?: string;
  expectedOnlyToolId?: string;
  tool_sequence?: string[];
}

export type SecuritySkillsDatasetExample = Example<
  SecuritySkillsDatasetInput,
  SecuritySkillsDatasetExpected,
  SecuritySkillsDatasetMetadata
>;

export const toDatasetExample = (ex: SecuritySkillsExample): SecuritySkillsDatasetExample => ({
  input: { question: ex.input.question },
  output: {
    reference: ex.expected.reference,
    expected: ex.expected.reference,
    ...(ex.expected.expectedSkill ? { expectedSkill: ex.expected.expectedSkill } : {}),
    ...(ex.expected.shouldNotActivateSkill
      ? { shouldNotActivateSkill: ex.expected.shouldNotActivateSkill }
      : {}),
    ...(ex.expected.tool_sequence ? { tool_sequence: ex.expected.tool_sequence } : {}),
  },
  metadata: {
    category: ex.metadata.category,
    query_intent: ex.metadata.query_intent,
    dataset_split: ex.metadata.dataset_split,
    ...(ex.metadata.is_distractor ? { is_distractor: true } : {}),
    ...(ex.metadata.expectedToolId ? { expectedToolId: ex.metadata.expectedToolId } : {}),
    ...(ex.metadata.expectedOnlyToolId
      ? { expectedOnlyToolId: ex.metadata.expectedOnlyToolId }
      : {}),
    ...(ex.metadata.tool_sequence ? { tool_sequence: ex.metadata.tool_sequence } : {}),
  },
});

const FILESTORE_READ_TOOL_ID = 'filestore.read';

function collectUniqueExpectedSkills(examples: SecuritySkillsDatasetExample[]): string[] {
  const names = new Set<string>();

  for (const example of examples) {
    const expectedSkill =
      example.output?.expectedSkill ?? getStringMeta(example.metadata, 'expectedSkill');
    if (expectedSkill) {
      names.add(expectedSkill);
    }
  }

  return [...names];
}

function hasShouldNotActivateExamples(examples: SecuritySkillsDatasetExample[]): boolean {
  return examples.some(
    (example) =>
      Boolean(example.output?.shouldNotActivateSkill) ||
      Boolean(getStringMeta(example.metadata, 'shouldNotActivateSkill'))
  );
}

function resolveTrajectoryGolden(
  expected?: SecuritySkillsDatasetExpected,
  metadata?: SecuritySkillsDatasetMetadata
): string[] {
  const toolSequence = expected?.tool_sequence ?? metadata?.tool_sequence;
  if (Array.isArray(toolSequence)) {
    return toolSequence.filter((id): id is string => typeof id === 'string' && id.length > 0);
  }
  const expectedOnlyToolId = metadata?.expectedOnlyToolId;
  if (expectedOnlyToolId) {
    return [expectedOnlyToolId];
  }
  const expectedToolId = metadata?.expectedToolId;
  return expectedToolId ? [expectedToolId] : [];
}

const createSecuritySkillsTrajectoryEvaluator = (): Evaluator<
  SecuritySkillsDatasetExample,
  TaskOutput
> => {
  const inner = createTrajectoryEvaluator({
    extractToolCalls: (output) =>
      getToolCallSteps(output as TaskOutput)
        .map((step) => step.tool_id)
        .filter((id): id is string => Boolean(id) && id !== FILESTORE_READ_TOOL_ID),
    goldenPathExtractor: (goldenExpected) => {
      const exp = goldenExpected as SecuritySkillsDatasetExpected | undefined;
      return exp?.tool_sequence ?? [];
    },
    orderWeight: 0.6,
    coverageWeight: 0.4,
  });

  return {
    ...inner,
    name: 'Trajectory',
    evaluate: async (args) => {
      const golden = resolveTrajectoryGolden(
        args.expected as SecuritySkillsDatasetExpected | undefined,
        args.metadata as SecuritySkillsDatasetMetadata | undefined
      );
      if (golden.length === 0) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'No tool trajectory annotation — skipping trajectory evaluation.',
        };
      }
      return inner.evaluate({
        ...args,
        expected: { ...(args.expected as object), tool_sequence: golden },
      });
    },
  } as Evaluator<SecuritySkillsDatasetExample, TaskOutput>;
};

const createExpectedToolCalledEvaluator = (): Evaluator<
  SecuritySkillsDatasetExample,
  TaskOutput
> => ({
  name: 'ExpectedToolCalled',
  kind: 'CODE',
  evaluate: async ({ output, metadata }) => {
    const expectedToolId = getStringMeta(metadata, 'expectedToolId');
    if (!expectedToolId) return { score: 1 };

    const toolCalls = getToolCallSteps(output as TaskOutput);
    if (toolCalls.length === 0) {
      return { score: 0, metadata: { reason: 'No tool calls found', expectedToolId } };
    }

    const usedToolIds = toolCalls.map((t) => t.tool_id).filter(Boolean);
    const invoked = usedToolIds.includes(expectedToolId);

    return {
      score: invoked ? 1 : 0,
      metadata: { expectedToolId, usedToolIds },
    };
  },
});

const createToolUsageOnlyEvaluator = (): Evaluator<SecuritySkillsDatasetExample, TaskOutput> => ({
  name: 'ToolUsageOnly',
  kind: 'CODE',
  evaluate: async ({ output, metadata }) => {
    const expectedOnlyToolId = getStringMeta(metadata, 'expectedOnlyToolId');
    if (!expectedOnlyToolId) return { score: 1 };

    const toolCalls = getToolCallSteps(output as TaskOutput);
    const domainToolCalls = toolCalls.filter((t) => t.tool_id && !isInternalTool(t.tool_id));

    if (domainToolCalls.length === 0) {
      return {
        score: 0,
        metadata: { reason: 'No domain tool calls found', expectedOnlyToolId },
      };
    }

    const usedToolIds = domainToolCalls.map((t) => t.tool_id).filter(Boolean);
    const hasExpected = usedToolIds.includes(expectedOnlyToolId);
    const allExpected = usedToolIds.every((id) => id === expectedOnlyToolId);

    return {
      score: hasExpected && allExpected ? 1 : 0,
      metadata: { expectedOnlyToolId, usedToolIds },
    };
  },
});

export type EvaluateSecuritySkillsDataset = (options: {
  dataset: {
    name: string;
    description: string;
    examples: SecuritySkillsExample[];
  };
}) => Promise<void>;

export const buildSecuritySkillsEvaluators = ({
  evaluators,
  traceEsClient,
  log,
  examples = [],
}: {
  evaluators: DefaultEvaluators;
  traceEsClient: EsClient;
  log: ToolingLog;
  examples?: SecuritySkillsDatasetExample[];
}): Array<Evaluator<SecuritySkillsDatasetExample, TaskOutput>> => {
  const { inputTokens, outputTokens, cachedTokens, toolCalls, latency } =
    evaluators.traceBasedEvaluators;

  return [
    ...(createQuantitativeCorrectnessEvaluators() as Array<
      Evaluator<SecuritySkillsDatasetExample, TaskOutput>
    >),
    createExpectedToolCalledEvaluator(),
    createToolUsageOnlyEvaluator(),
    createSecuritySkillsTrajectoryEvaluator(),
    toolCalls as Evaluator<SecuritySkillsDatasetExample, TaskOutput>,
    latency as Evaluator<SecuritySkillsDatasetExample, TaskOutput>,
    inputTokens as Evaluator<SecuritySkillsDatasetExample, TaskOutput>,
    outputTokens as Evaluator<SecuritySkillsDatasetExample, TaskOutput>,
    cachedTokens as Evaluator<SecuritySkillsDatasetExample, TaskOutput>,
    ...collectUniqueExpectedSkills(examples).map((skillName) =>
      createSkillInvocationEvaluator({
        traceEsClient,
        log,
        skillName,
      })
    ),
    ...(hasShouldNotActivateExamples(examples)
      ? [
          {
            name: 'ExpectedSkillInvocation',
            kind: 'CODE' as const,
            evaluate: async ({ output, expected, metadata }) => {
              const shouldNotActivate =
                (expected as SecuritySkillsDatasetExpected | undefined)?.shouldNotActivateSkill ??
                getStringMeta(metadata, 'shouldNotActivateSkill');
              if (!shouldNotActivate) {
                return { score: 1 };
              }
              if (!/^[a-zA-Z0-9_-]+$/.test(shouldNotActivate)) {
                return {
                  score: null,
                  label: 'error',
                  explanation: `Invalid skill name: ${shouldNotActivate}`,
                };
              }

              const traceId = (output as Record<string, unknown>)?.traceId as string | undefined;
              if (!traceId) {
                return {
                  score: null,
                  label: 'unavailable',
                  explanation: 'No traceId available for skill invocation check',
                };
              }
              if (!/^[a-zA-Z0-9_-]+$/.test(traceId)) {
                return {
                  score: null,
                  label: 'error',
                  explanation: `Invalid traceId for skill invocation check: ${traceId}`,
                };
              }

              const query = `FROM traces-*
| WHERE trace.id == "${traceId}"
| STATS skill_invoked = COUNT(
    CASE(
      ${buildSkillInvokedCaseExpression(shouldNotActivate)},
      1,
      NULL
    )
  )`;

              try {
                const response = (await traceEsClient.esql.query({ query })) as unknown as {
                  values: number[][];
                };
                const invoked = (response.values?.[0]?.[0] ?? 0) > 0;
                return {
                  score: invoked ? 0 : 1,
                  metadata: { shouldNotActivateSkill: shouldNotActivate, invoked },
                };
              } catch (error) {
                log.warning(
                  `ExpectedSkillInvocation failed for trace ${traceId}: ${
                    error instanceof Error ? error.message : String(error)
                  }`
                );
                return { score: null, label: 'error' };
              }
            },
          } as Evaluator<SecuritySkillsDatasetExample, TaskOutput>,
        ]
      : []),
  ];
};

const buildTask = ({
  chatClient,
  evaluators,
  log,
}: {
  chatClient: SecuritySkillsAgentBuilderChatClient;
  evaluators: DefaultEvaluators;
  log: ToolingLog;
}): ExperimentTask<SecuritySkillsDatasetExample, TaskOutput> => {
  return async (example) => {
    const { input, output: expected, metadata } = example;
    const question = input?.question ?? '';
    const questionPreview = `${question.slice(0, 120)}${question.length > 120 ? '...' : ''}`;
    log.info(`[security-skills] task request: question="${questionPreview}"`);

    const response = await chatClient.converse({ message: question });

    const taskOutput = {
      messages: response.messages,
      steps: response.steps,
      errors: response.errors,
      traceId: response.traceId,
    };

    const correctnessResult = await withEvaluatorSpan('CorrectnessAnalysis', {}, () =>
      evaluators.correctnessAnalysis().evaluate({
        input,
        expected,
        output: taskOutput,
        metadata,
      })
    );

    return {
      ...taskOutput,
      correctnessAnalysis: correctnessResult?.metadata,
    };
  };
};

export const createEvaluateSecuritySkillsDataset = ({
  chatClient,
  evaluators,
  executorClient,
  traceEsClient,
  log,
}: {
  chatClient: SecuritySkillsAgentBuilderChatClient;
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  traceEsClient: EsClient;
  log: ToolingLog;
}): EvaluateSecuritySkillsDataset => {
  return async ({ dataset: { name, description, examples } }) => {
    const wrappedExamples = examples.map(toDatasetExample);

    const dataset = {
      name,
      description,
      examples: wrappedExamples,
    } satisfies EvaluationDataset<SecuritySkillsDatasetExample>;

    const evalStack = buildSecuritySkillsEvaluators({
      evaluators,
      traceEsClient,
      log,
      examples: wrappedExamples,
    });
    const task = buildTask({ chatClient, evaluators, log });

    await executorClient.runExperiment({ datasets: [dataset], task }, evalStack);
  };
};
