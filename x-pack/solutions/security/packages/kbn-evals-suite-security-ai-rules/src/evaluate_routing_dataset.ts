/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { isInternalTool } from '@kbn/agent-builder-common/tools';
import {
  createSkillInvocationEvaluator,
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
} from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import type { RuleRoutingExample } from '../datasets/routing_examples';
import type { SecurityRuleGenerationClient } from './chat_client';

export interface RuleRoutingDatasetInput extends Record<string, unknown> {
  question: string;
}

export interface RuleRoutingDatasetExpected {
  reference: string;
  expectedSkill?: string;
  shouldNotActivateSkill?: string;
  tool_sequence?: string[];
}

export interface RuleRoutingDatasetMetadata extends Record<string, unknown> {
  category: string;
  routing_intent: string;
  dataset_split: string[];
  is_distractor?: boolean;
  expectedToolId?: string;
  expectedOnlyToolId?: string;
  forbiddenToolId?: string;
  tool_sequence?: string[];
}

export type RuleRoutingDatasetExample = Example<
  RuleRoutingDatasetInput,
  RuleRoutingDatasetExpected,
  RuleRoutingDatasetMetadata
>;

export const toRoutingDatasetExample = (ex: RuleRoutingExample): RuleRoutingDatasetExample => ({
  input: { question: ex.input.question },
  output: {
    reference: ex.expected.reference,
    ...(ex.expected.expectedSkill ? { expectedSkill: ex.expected.expectedSkill } : {}),
    ...(ex.expected.shouldNotActivateSkill
      ? { shouldNotActivateSkill: ex.expected.shouldNotActivateSkill }
      : {}),
    ...(ex.expected.tool_sequence ? { tool_sequence: ex.expected.tool_sequence } : {}),
  },
  metadata: {
    category: ex.metadata.category,
    routing_intent: ex.metadata.routing_intent,
    dataset_split: ex.metadata.dataset_split,
    ...(ex.metadata.is_distractor ? { is_distractor: true } : {}),
    ...(ex.metadata.expectedToolId ? { expectedToolId: ex.metadata.expectedToolId } : {}),
    ...(ex.metadata.expectedOnlyToolId
      ? { expectedOnlyToolId: ex.metadata.expectedOnlyToolId }
      : {}),
    ...(ex.metadata.forbiddenToolId ? { forbiddenToolId: ex.metadata.forbiddenToolId } : {}),
    ...(ex.metadata.tool_sequence ? { tool_sequence: ex.metadata.tool_sequence } : {}),
  },
});

const FILESTORE_READ_TOOL_ID = 'filestore.read';
const FIND_SECURITY_RULES_SKILL = 'find-security-rules';

function collectUniqueExpectedSkills(examples: RuleRoutingDatasetExample[]): string[] {
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

function hasShouldNotActivateExamples(examples: RuleRoutingDatasetExample[]): boolean {
  return examples.some(
    (example) =>
      Boolean(example.output?.shouldNotActivateSkill) ||
      Boolean(getStringMeta(example.metadata, 'shouldNotActivateSkill'))
  );
}

function hasForbiddenToolExamples(examples: RuleRoutingDatasetExample[]): boolean {
  return examples.some((example) => Boolean(getStringMeta(example.metadata, 'forbiddenToolId')));
}

function resolveTrajectoryGolden(
  expected?: RuleRoutingDatasetExpected,
  metadata?: RuleRoutingDatasetMetadata
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

const createRuleRoutingTrajectoryEvaluator = (): Evaluator<
  RuleRoutingDatasetExample,
  TaskOutput
> => {
  const inner = createTrajectoryEvaluator({
    extractToolCalls: (output) =>
      getToolCallSteps(output as TaskOutput)
        .map((step) => step.tool_id)
        .filter((id): id is string => Boolean(id) && id !== FILESTORE_READ_TOOL_ID),
    goldenPathExtractor: (goldenExpected) => {
      const exp = goldenExpected as RuleRoutingDatasetExpected | undefined;
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
        args.expected as RuleRoutingDatasetExpected | undefined,
        args.metadata as RuleRoutingDatasetMetadata | undefined
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
  } as Evaluator<RuleRoutingDatasetExample, TaskOutput>;
};

const createExpectedToolCalledEvaluator = (): Evaluator<RuleRoutingDatasetExample, TaskOutput> => ({
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

const createToolUsageOnlyEvaluator = (): Evaluator<RuleRoutingDatasetExample, TaskOutput> => ({
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

const createForbiddenToolEvaluator = (): Evaluator<RuleRoutingDatasetExample, TaskOutput> => ({
  name: 'ForbiddenToolNotCalled',
  kind: 'CODE',
  evaluate: async ({ output, metadata }) => {
    const forbiddenToolId = getStringMeta(metadata, 'forbiddenToolId');
    if (!forbiddenToolId) return { score: 1 };

    const usedToolIds = getToolCallSteps(output as TaskOutput)
      .map((t) => t.tool_id)
      .filter(Boolean);
    const invoked = usedToolIds.includes(forbiddenToolId);

    return {
      score: invoked ? 0 : 1,
      metadata: { forbiddenToolId, usedToolIds, invoked },
    };
  },
});

export const buildRuleRoutingEvaluators = ({
  evaluators,
  traceEsClient,
  log,
  examples = [],
}: {
  evaluators: DefaultEvaluators;
  traceEsClient: EsClient;
  log: ToolingLog;
  examples?: RuleRoutingDatasetExample[];
}): Array<Evaluator<RuleRoutingDatasetExample, TaskOutput>> => {
  const { inputTokens, outputTokens, cachedTokens, toolCalls, latency } =
    evaluators.traceBasedEvaluators;

  const skillNames = collectUniqueExpectedSkills(examples);
  if (!skillNames.includes(FIND_SECURITY_RULES_SKILL)) {
    skillNames.push(FIND_SECURITY_RULES_SKILL);
  }

  return [
    createExpectedToolCalledEvaluator(),
    createToolUsageOnlyEvaluator(),
    ...(hasForbiddenToolExamples(examples) ? [createForbiddenToolEvaluator()] : []),
    createRuleRoutingTrajectoryEvaluator(),
    toolCalls as Evaluator<RuleRoutingDatasetExample, TaskOutput>,
    latency as Evaluator<RuleRoutingDatasetExample, TaskOutput>,
    inputTokens as Evaluator<RuleRoutingDatasetExample, TaskOutput>,
    outputTokens as Evaluator<RuleRoutingDatasetExample, TaskOutput>,
    cachedTokens as Evaluator<RuleRoutingDatasetExample, TaskOutput>,
    ...skillNames.map((skillName) =>
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
                (expected as RuleRoutingDatasetExpected | undefined)?.shouldNotActivateSkill ??
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
      attributes.gen_ai.tool.name == "filestore.read"
        AND attributes.gen_ai.tool.call.arguments LIKE "*/${shouldNotActivate}/SKILL.md*",
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
          } as Evaluator<RuleRoutingDatasetExample, TaskOutput>,
        ]
      : []),
  ];
};

export type EvaluateRuleRoutingDataset = (options: {
  dataset: {
    name: string;
    description: string;
    examples: RuleRoutingExample[];
  };
}) => Promise<void>;

export const createEvaluateRuleRoutingDataset = ({
  chatClient,
  evaluators,
  executorClient,
  traceEsClient,
  log,
}: {
  chatClient: SecurityRuleGenerationClient;
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  traceEsClient: EsClient;
  log: ToolingLog;
}): EvaluateRuleRoutingDataset => {
  return async ({ dataset: { name, description, examples } }) => {
    const wrappedExamples = examples.map(toRoutingDatasetExample);

    const dataset = {
      name,
      description,
      examples: wrappedExamples,
    } satisfies EvaluationDataset<RuleRoutingDatasetExample>;

    const evalStack = buildRuleRoutingEvaluators({
      evaluators,
      traceEsClient,
      log,
      examples: wrappedExamples,
    });

    const task: ExperimentTask<RuleRoutingDatasetExample, TaskOutput> = async (example) => {
      const question = example.input?.question ?? '';
      const preview = `${question.slice(0, 120)}${question.length > 120 ? '...' : ''}`;
      log.info(`[security-ai-rules routing] question="${preview}"`);

      const response = await chatClient.converseNaturalLanguage(question);

      return {
        messages: response.messages,
        steps: response.steps,
        errors: response.errors,
        traceId: response.traceId,
      };
    };

    await executorClient.runExperiment({ datasets: [dataset], task }, evalStack);
  };
};
