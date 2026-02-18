/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, EvaluationDataset, Example, EvalsExecutorClient } from '@kbn/evals';
import type { ReferenceRule } from '../datasets/sample_rules';
import type { SecurityRuleGenerationClient } from './chat_client';
import type { RuleGenerationTaskOutput } from './evaluators';

type RuleExample = Example<{ prompt: string }, ReferenceRule, Record<string, unknown> | null>;

interface EvaluateDatasetOptions {
  executorClient: EvalsExecutorClient;
  log: { info: (msg: string) => void; debug: (msg: string) => void; error: (msg: string) => void };
  dataset: EvaluationDataset<RuleExample>;
  chatClient: SecurityRuleGenerationClient;
  evaluators: Array<Evaluator<RuleExample, RuleGenerationTaskOutput>>;
}

export const evaluateDataset = async ({
  executorClient,
  log,
  dataset,
  chatClient,
  evaluators,
}: EvaluateDatasetOptions): Promise<void> => {
  await executorClient.runExperiment(
    {
      dataset,
      task: async ({ input }) => {
        try {
          log.debug(`Generating rule for prompt: ${input.prompt.substring(0, 100)}...`);
          const taskResult = await chatClient.generateRule(input.prompt);

          if (!taskResult.generatedRule) {
            return { error: taskResult.error || 'No rule returned from agent' };
          }

          log.debug(`Generated rule: ${taskResult.generatedRule.name}`);
          log.debug(
            `Generated query preview: ${taskResult.generatedRule.query?.substring(0, 150)}...`
          );
          return taskResult;
        } catch (error) {
          log.error(
            `Error generating rule: ${error instanceof Error ? error.message : String(error)}`
          );
          return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
      },
    },
    evaluators
  );
};
