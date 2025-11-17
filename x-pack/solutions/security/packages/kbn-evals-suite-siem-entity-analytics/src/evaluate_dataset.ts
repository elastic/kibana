/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import type { DefaultEvaluators, KibanaPhoenixClient, EvaluationDataset } from '@kbn/evals';
import type { EvaluationResult } from '@arizeai/phoenix-client/dist/esm/types/experiments';
import type {
  SiemEntityAnalyticsEvaluationChatClient,
  ErrorResponse,
  Step,
  Messages,
} from './chat_client';

interface ToolCallAssertion {
  id: string;
  criteria?: string[];
}

interface DatasetExample extends Example {
  input: {
    question: string;
  };
  output: {
    criteria?: string[];
    toolCalls?: ToolCallAssertion[];
  };
  metadata?: {
    query_intent?: string;
    [key: string]: unknown;
  };
}

/**
 * Task output for SIEM Entity Analytics chat evaluations.
 * Satisfies Phoenix's TaskOutput type (string | boolean | number | object | null).
 */
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
 * Evaluates main criteria from the expected output.
 */
async function evaluateMainCriteria(
  criteria: string[],
  evaluators: DefaultEvaluators,
  input: DatasetExample['input'],
  output: ChatTaskOutput,
  expected: DatasetExample['output'],
  metadata: DatasetExample['metadata']
): Promise<EvaluationResult> {
  if (criteria.length === 0) {
    return {
      score: 1,
      label: 'PASS',
      explanation: 'No main criteria specified.',
    };
  }

  return evaluators.criteria(criteria).evaluate({ input, expected, output, metadata });
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
async function evaluateToolCallAssertion(
  toolCallAssertion: ToolCallAssertion,
  steps: Step[],
  evaluators: DefaultEvaluators,
  input: DatasetExample['input'],
  output: ChatTaskOutput,
  metadata: DatasetExample['metadata']
): Promise<EvaluationResult> {
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
}

/**
 * Evaluates all tool call assertions and returns their results.
 */
async function evaluateAllToolCalls(
  toolCalls: ToolCallAssertion[],
  steps: Step[],
  evaluators: DefaultEvaluators,
  input: DatasetExample['input'],
  output: ChatTaskOutput,
  metadata: DatasetExample['metadata']
): Promise<EvaluationResult[]> {
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
}

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

export function createEvaluateDataset({
  evaluators,
  phoenixClient,
  chatClient,
}: {
  evaluators: DefaultEvaluators;
  phoenixClient: KibanaPhoenixClient;
  chatClient: SiemEntityAnalyticsEvaluationChatClient;
}): EvaluateDataset {
  return async function evaluateDataset({
    dataset: { name, description, examples },
  }: {
    dataset: {
      name: string;
      description: string;
      examples: DatasetExample[];
    };
  }) {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset;

    await phoenixClient.runExperiment(
      {
        dataset,
        task: async ({ input }) => {
          const response = await chatClient.converse({
            messages: [{ message: input.question }],
          });

          return {
            errors: response.errors,
            messages: response.messages,
            steps: response.steps,
          };
        },
      },
      [
        createCriteriaEvaluator({
          evaluators,
        }),
        createToolCallsEvaluator({
          evaluators,
        }),
      ]
    );
  };
}

/**
 * Evaluator for main criteria (response quality, content, etc.).
 */
export function createCriteriaEvaluator({ evaluators }: { evaluators: DefaultEvaluators }) {
  return {
    name: 'Criteria',
    kind: 'LLM' as const,
    evaluate: async ({
      input,
      output,
      expected,
      metadata,
    }: {
      input: DatasetExample['input'];
      output: ChatTaskOutput;
      expected: DatasetExample['output'];
      metadata: DatasetExample['metadata'];
    }) => {
      const criteria = expected.criteria ?? [];
      return evaluateMainCriteria(criteria, evaluators, input, output, expected, metadata);
    },
  };
}

/**
 * Evaluator for tool call assertions.
 * Checks that specified tools were called and evaluates their criteria.
 */
export function createToolCallsEvaluator({ evaluators }: { evaluators: DefaultEvaluators }) {
  return {
    name: 'ToolCalls',
    kind: 'LLM' as const,
    evaluate: async ({
      input,
      output,
      expected,
      metadata,
    }: {
      input: DatasetExample['input'];
      output: ChatTaskOutput;
      expected: DatasetExample['output'];
      metadata: DatasetExample['metadata'];
    }) => {
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
}
