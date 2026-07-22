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
} from './datasets/persona_matrix_prompts';
import type { PersonaMatrixChatClient } from './chat_client';

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
          .map((e) => (e.metadata as Record<string, string> | undefined)?.expectedSkill)
          .filter((s): s is string => !!s)
      )
    );

    const skillEvaluators = expectedSkills.map((skillName) =>
      createExampleScopedSkillInvocationEvaluator({
        traceEsClient,
        log,
        skillName,
        resolveContext: (args) => {
          const expectedSkill = (args.metadata as Record<string, string> | undefined)?.expectedSkill;
          return { expectedSkill };
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

    const { inputTokens, outputTokens, cachedTokens, toolCalls, latency } =
      evaluators.traceBasedEvaluators;

    const allEvaluators: Evaluator[] = [
      ...skillEvaluators,
      trajectoryEvaluator,
      ...correctnessEvaluators,
      evaluators.criteria([
        'Relevance: The response directly addresses the user security question.',
        'Clarity: The response is well-structured and easy to follow.',
        'Accuracy: Security concepts and recommendations are technically correct.',
        'Completeness: The response covers the key aspects of the question.',
      ]),
      inputTokens,
      outputTokens,
      cachedTokens,
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
          return {
            response,
            traceId: response.traceId ?? null,
            steps: response.steps,
            skillId: response.traceId ?? 'unknown',
            tags: example.metadata?.tags ?? [],
          } as TaskOutput;
        },
      },
      allEvaluators
    );

    log.info('[persona-matrix] dataset evaluation complete');
  };
}
