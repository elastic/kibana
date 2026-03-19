/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createQuantitativeCorrectnessEvaluators,
  createQuantitativeGroundednessEvaluator,
  selectEvaluators,
  withEvaluatorSpan,
  type DefaultEvaluators,
  type EvalsExecutorClient,
  type EvaluationDataset,
  type EvaluationResult,
  type Evaluator,
  type Example,
} from '@kbn/evals';
import type { EvaluationChatClient, ErrorResponse, Step, Messages } from './chat_client';

interface ToolCallAssertion {
  id: string;
  criteria?: string[];
}

interface DatasetExample extends Example {
  input: { question: string };
  output: { criteria?: string[]; toolCalls?: ToolCallAssertion[] };
  metadata?: { query_intent?: string };
}

interface ChatTaskOutput {
  errors: ErrorResponse[];
  messages: Messages;
  steps?: Step[];
}

export type EvaluateDataset = ({
  dataset: { name, description, examples },
}: {
  dataset: {
    name: string;
    description: string;
    examples: DatasetExample[];
  };
  concurrency?: number;
}) => Promise<void>;

/**
 * Finds tool call steps for a specific tool ID.
 * @param toolId - The tool ID to search for
 * @param steps - The conversation steps to search
 * @returns Array of tool call steps matching the tool ID
 */
function findToolCallSteps(toolId: string, steps: Step[]): Step[] {
  return steps.filter(
    (step) =>
      (step as { type?: string; tool_id?: string }).type === 'tool_call' &&
      (step as { type?: string; tool_id?: string }).tool_id === toolId
  );
}

/**
 * Evaluates a tool call assertion with its specific criteria.
 * @param toolCallAssertion - The tool call assertion to evaluate
 * @param steps - The conversation steps to search for tool calls
 * @param evaluators - The evaluators to use for criteria evaluation
 * @param input - The input from the example
 * @param output - The chat output
 * @param metadata - The metadata from the example
 * @returns Evaluation result for the tool call
 */
const evaluateToolCallAssertion = async (
  toolCallAssertion: ToolCallAssertion,
  steps: Step[],
  evaluators: DefaultEvaluators,
  input: DatasetExample['input'],
  output: ChatTaskOutput,
  metadata: DatasetExample['metadata']
): Promise<EvaluationResult> => {
  const toolCallSteps = findToolCallSteps(toolCallAssertion.id, steps);
  const toolWasCalled = toolCallSteps.length > 0;

  if (!toolWasCalled) {
    return {
      score: 0,
      label: 'FAIL',
      explanation: `Tool "${toolCallAssertion.id}" was not called during the conversation.`,
    };
  }

  // If no specific criteria for this tool call, just check that it was called
  if (!toolCallAssertion.criteria || toolCallAssertion.criteria.length === 0) {
    return {
      score: 1,
      label: 'PASS',
      explanation: `Tool "${toolCallAssertion.id}" was called during the conversation.`,
    };
  }

  // Evaluate the specific criteria for this tool call
  const toolCriteriaResult = await evaluators
    .criteria(toolCallAssertion.criteria)
    .evaluate({ input, expected: { criteria: toolCallAssertion.criteria }, output, metadata });

  const toolCallExplanation = `Tool "${toolCallAssertion.id}" was called during the conversation.`;
  const combinedExplanation = `${toolCallExplanation} ${toolCriteriaResult.explanation ?? ''}`;

  return {
    score: toolCriteriaResult.score ?? null,
    label: toolCriteriaResult.label ?? 'PASS',
    explanation: combinedExplanation,
  };
};

const evaluateAllToolCalls = async (
  toolCalls: ToolCallAssertion[],
  steps: Step[],
  evaluators: DefaultEvaluators,
  input: DatasetExample['input'],
  output: ChatTaskOutput,
  metadata: DatasetExample['metadata']
): Promise<EvaluationResult[]> => {
  const results: EvaluationResult[] = [];

  for (const toolCallAssertion of toolCalls) {
    const result = await evaluateToolCallAssertion(
      toolCallAssertion,
      steps,
      evaluators,
      input,
      output,
      metadata
    );
    results.push(result);
  }

  return results;
};

/**
 * Combines multiple evaluation results into a single result.
 * All results must pass for the overall result to pass.
 */
function combineEvaluationResults(results: EvaluationResult[]): EvaluationResult {
  const allPassed = results.every((result) => result.label === 'PASS' && (result.score ?? 0) > 0);

  const scores = results.map((r) => r.score ?? 0).filter((s) => s !== null);
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const explanations = results.map((r) => r.explanation ?? '').filter((e) => e.length > 0);

  return {
    score: allPassed ? averageScore : 0,
    label: allPassed ? 'PASS' : 'FAIL',
    explanation: explanations.join(' '),
  };
}

interface EvaluateDatasetOpts {
  dataset: { name: string; description: string; examples: DatasetExample[] };
  concurrency?: number;
}

const DEFAULT_CONCURRENCY = 3;

interface CreateEvaluateDatasetOpts {
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  chatClient: EvaluationChatClient;
}

export function createEvaluateDataset({
  evaluators,
  executorClient,
  chatClient,
}: CreateEvaluateDatasetOpts): EvaluateDataset {
  return async function evaluateDataset({
    dataset: { name, description, examples },
    concurrency = DEFAULT_CONCURRENCY,
  }: EvaluateDatasetOpts) {
    const dataset = { name, description, examples } satisfies EvaluationDataset;

    await executorClient.runExperiment(
      {
        dataset,
        concurrency,
        task: async ({ input, output, metadata }) => {
          const response = await chatClient.converse({ messages: [{ message: input.question }] });

          let correctnessResult: { metadata?: unknown } | undefined;
          let groundednessResult: { metadata?: unknown } | undefined;

          const result = await Promise.all([
            withEvaluatorSpan('CorrectnessAnalysis', {}, () =>
              evaluators.correctnessAnalysis().evaluate({
                input,
                expected: output,
                output: response,
                metadata,
              })
            ),
            withEvaluatorSpan('GroundednessAnalysis', {}, () =>
              evaluators.groundednessAnalysis().evaluate({
                input,
                expected: output,
                output: response,
                metadata,
              })
            ),
          ]).catch(() => {
            // Catch cases where these optional evaluators fail so that entire evaluation doesn't fail
          });

          if (result) {
            correctnessResult = result[0];
            groundednessResult = result[1];
          }

          return {
            errors: response.errors,
            messages: response.messages,
            steps: response.steps,
            traceId: response.traceId,
            modelUsage: response.modelUsage,
            correctnessAnalysis: correctnessResult?.metadata,
            groundednessAnalysis: groundednessResult?.metadata,
          };
        },
      },
      [
        createCriteriaEvaluator({ evaluators }),
        createToolCallsEvaluator({ evaluators }),
        ...selectEvaluators([
          createQuantitativeGroundednessEvaluator(),
          ...createQuantitativeCorrectnessEvaluators(),
        ]),
      ]
    );
  };
}

interface EvaluateOpts {
  input: DatasetExample['input'];
  output: ChatTaskOutput;
  expected: DatasetExample['output'];
  metadata: DatasetExample['metadata'];
}

const createCriteriaEvaluator = ({
  evaluators,
}: {
  evaluators: DefaultEvaluators;
}): Evaluator<DatasetExample, ChatTaskOutput> => {
  return {
    name: 'Criteria',
    kind: 'LLM' as const,
    evaluate: async ({ expected, ...rest }: EvaluateOpts) => {
      const criteria = expected.criteria ?? [];

      if (criteria.length === 0) {
        return {
          score: 1,
          label: 'PASS',
          explanation: 'No main criteria specified.',
        };
      }

      return evaluators.criteria(criteria).evaluate({ expected, ...rest });
    },
  };
};

const createToolCallsEvaluator = ({ evaluators }: { evaluators: DefaultEvaluators }) => {
  return {
    name: 'ToolCalls',
    kind: 'LLM' as const,
    evaluate: async ({ input, output, expected, metadata }: EvaluateOpts) => {
      const toolCalls = expected.toolCalls ?? [];
      const steps = output.steps ?? [];

      if (toolCalls.length === 0) {
        return {
          score: 1,
          label: 'PASS',
          explanation: 'No tool call assertions specified.',
        };
      }

      const toolCallResults = await evaluateAllToolCalls(
        toolCalls,
        steps,
        evaluators,
        input,
        output,
        metadata
      );

      return combineEvaluationResults(toolCallResults);
    },
  };
};
