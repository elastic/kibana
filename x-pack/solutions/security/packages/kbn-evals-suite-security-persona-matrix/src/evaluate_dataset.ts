/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import {
  createExampleScopedSkillInvocationEvaluator,
  createTrajectoryEvaluator,
  getToolCallSteps,
  withEvaluatorSpan,
  type DefaultEvaluators,
  type EvalsExecutorClient,
  type EvaluationDataset,
  type Evaluator,
  type TaskOutput,
} from '@kbn/evals';
import { createAgentBuilderCorrectnessEvaluators } from '@kbn/evals-extensions';
import type { ToolingLog } from '@kbn/tooling-log';
import type {
  PersonaMatrixExample,
  PersonaMatrixExampleInput,
  PersonaMatrixExampleOutput,
} from './datasets/persona_matrix_prompts';
import type { PersonaMatrixChatClient } from './chat_client';

/**
 * ExpectedToolCalled — verifies the primary expected tool was invoked.
 * Reads `expectedTools` from example metadata (first entry) or `tool_sequence`
 * from the expected output.
 */
const createPersonaMatrixExpectedToolCalledEvaluator = (): Evaluator => ({
  name: 'ExpectedToolCalled',
  kind: 'CODE',
  evaluate: async ({ output, expected, metadata }) => {
    // Try tool_sequence from expected output first, then expectedTools from metadata
    const toolSequence = (expected as PersonaMatrixExampleOutput | undefined)?.tool_sequence;
    const meta = metadata as { expectedTools?: string[] } | undefined;
    const expectedTools = meta?.expectedTools ?? toolSequence;

    if (!expectedTools?.length) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'No expectedTools annotation — skipping ExpectedToolCalled.',
      };
    }

    const expectedToolId = expectedTools[0];
    const usedToolIds = getToolCallSteps(output as TaskOutput)
      .map((step) => step.tool_id)
      .filter((id): id is string => Boolean(id));

    return {
      score: usedToolIds.includes(expectedToolId) ? 1 : 0,
      metadata: { expectedToolId, usedToolIds },
    };
  },
});

export function createEvaluatePersonaMatrixDataset({
  chatClient,
  evaluators,
  executorClient,
  traceEsClient,
  log,
}: {
  chatClient: PersonaMatrixChatClient;
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  traceEsClient: EsClient;
  log: ToolingLog;
}) {
  return async function evaluateDataset({
    dataset,
  }: {
    dataset: EvaluationDataset<PersonaMatrixExample>;
  }): Promise<void> {
    const expectedSkills = Array.from(
      new Set(
        dataset.examples
          .map((e) => (e.metadata as Record<string, unknown> | undefined)?.expectedSkill)
          .filter((s): s is string => typeof s === 'string')
      )
    );

    const skillEvaluators = expectedSkills.map((skillName) =>
      createExampleScopedSkillInvocationEvaluator({
        traceEsClient,
        log,
        skillName,
        resolveContext: (args) => {
          const expectedSkill = (args.metadata as Record<string, unknown> | undefined)
            ?.expectedSkill;
          return { expectedSkill: typeof expectedSkill === 'string' ? expectedSkill : undefined };
        },
      })
    );

    const trajectoryEvaluator = createTrajectoryEvaluator({
      extractToolCalls: (output) => {
        const steps = (output as { steps?: Array<{ tool_id?: string }> })?.steps;
        if (!Array.isArray(steps)) return [];
        return steps.map((s) => s.tool_id).filter((t): t is string => typeof t === 'string');
      },
      goldenPathExtractor: (expected) => {
        const meta = expected as { tool_sequence?: string[] };
        return meta?.tool_sequence ?? [];
      },
    });

    const correctnessEvaluators = createAgentBuilderCorrectnessEvaluators();

    const expectedToolCalledEvaluator = createPersonaMatrixExpectedToolCalledEvaluator();

    const { inputTokens, outputTokens, toolCalls, latency } = evaluators.traceBasedEvaluators;

    const allEvaluators: Evaluator[] = [
      ...skillEvaluators,
      trajectoryEvaluator,
      expectedToolCalledEvaluator,
      ...correctnessEvaluators,
      evaluators.criteria([
        'Relevance: The response directly addresses the user security question.',
        'Clarity: The response is well-structured and easy to follow.',
        'Accuracy: Security concepts and recommendations are technically correct.',
        'Completeness: The response covers the key aspects of the question.',
      ]),
      inputTokens,
      outputTokens,
      toolCalls,
      latency,
    ];

    await executorClient.runExperiment(
      {
        datasets: [dataset],
        metadata: { suite: 'security-persona-matrix', source: 'persona-matrix-eval' },
        task: async (example) => {
          const input = example.input as PersonaMatrixExampleInput;
          const question = input?.question;
          if (!question) throw new Error('Missing question in example input');
          const response = await chatClient.query(question, input?.attachment);

          const taskOutput: TaskOutput = {
            response,
            traceId: response.traceId ?? null,
            steps: response.steps,
            skillId: response.traceId ?? 'unknown',
            tags: example.metadata?.tags ?? [],
          } as TaskOutput;

          // Run correctnessAnalysis (structured LLM judge) and attach metadata
          try {
            const correctnessResult = await withEvaluatorSpan('CorrectnessAnalysis', {}, () =>
              evaluators.correctnessAnalysis().evaluate({
                input,
                expected: example.output,
                output: taskOutput,
                metadata: example.metadata,
              })
            );
            return {
              ...(taskOutput as object),
              correctnessAnalysis: correctnessResult?.metadata,
            } as TaskOutput;
          } catch {
            // Judge model may fail; continue without correctnessAnalysis
            return taskOutput;
          }
        },
      },
      allEvaluators
    );

    log.info('[persona-matrix] dataset evaluation complete');
  };
}
