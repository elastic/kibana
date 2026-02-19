/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../src/evaluate';
import { createEvaluateDataset } from '../src/evaluate_dataset';
import { sampleRules } from '../datasets/sample_rules';
import { hardCases } from '../datasets/hard_cases';

evaluate.describe(
  'AI Rule Generation',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate('generates accurate detection rules', async ({
      executorClient,
      evaluators,
      chatClient,
      log,
    }) => {
      const evaluateDataset = createEvaluateDataset({ evaluators, executorClient, chatClient, log });

      log.info(`Running AI rule generation evaluation with ${sampleRules.length} examples`);
      await evaluateDataset({
        dataset: {
          name: 'security-ai-rules: rule-generation-basic',
          description:
            'Evaluates AI-generated detection rules against known examples from elastic/detection-rules',
          examples: sampleRules.map((rule) => ({
            input: { prompt: `Generate a detection rule that ${rule.description.toLowerCase()}` },
            output: rule,
            metadata: { category: rule.category, difficulty: 'medium', expectedName: rule.name },
          })),
        },
      });
      log.info('AI rule generation evaluation complete');
    });

    evaluate('handles edge cases and errors gracefully', async ({
      executorClient,
      evaluators,
      chatClient,
      log,
    }) => {
      const evaluateDataset = createEvaluateDataset({ evaluators, executorClient, chatClient, log });

      log.info('Running edge case evaluation');
      await evaluateDataset({
        dataset: {
          name: 'security-ai-rules: edge-cases',
          description: 'Tests AI rule generation with edge cases and challenging prompts',
          examples: hardCases.map((c) => ({
            input: { prompt: c.prompt },
            output: c.output,
            metadata: c.metadata,
          })),
        },
      });
      log.info('Edge case evaluation complete');
    });
  }
);
