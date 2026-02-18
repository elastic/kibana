/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../src/evaluate';
import { evaluateDataset } from '../src/evaluate_dataset';
import { createRuleEvaluators } from '../src/evaluators';
import { sampleRules } from '../datasets/sample_rules';

evaluate.describe(
  'AI Rule Generation',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate('generates accurate detection rules', async ({
      executorClient,
      inferenceClient,
      chatClient,
      log,
    }) => {
      log.info(`Running AI rule generation evaluation with ${sampleRules.length} examples`);
      await evaluateDataset({
        executorClient,
        log,
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
        chatClient,
        evaluators: createRuleEvaluators({ inferenceClient }),
      });
      log.info('AI rule generation evaluation complete');
    });

    evaluate('handles edge cases and errors gracefully', async ({
      executorClient,
      inferenceClient,
      chatClient,
      log,
    }) => {
      log.info('Running edge case evaluation');
      await evaluateDataset({
        executorClient,
        log,
        dataset: {
          name: 'security-ai-rules: edge-cases',
          description: 'Tests AI rule generation with edge cases and challenging prompts',
          examples: [
            {
              input: { prompt: 'Detect suspicious activity' },
              output: {
                name: 'Generic Suspicious Activity',
                description: 'Detects suspicious activity',
                query: 'process where true',
                threat: [],
                severity: 'low',
                tags: [],
                riskScore: 21,
                from: 'now-5m',
                category: 'unknown',
              },
              metadata: { testType: 'vague-prompt', difficulty: 'hard' },
            },
            {
              input: {
                prompt:
                  'Create a rule for detecting advanced persistent threat actors using zero-day exploits with polymorphic malware and anti-forensics techniques',
              },
              output: {
                name: 'Complex APT Detection',
                description: 'Detects advanced persistent threats',
                query: 'process where true',
                threat: [],
                severity: 'critical',
                tags: [],
                riskScore: 99,
                from: 'now-5m',
                category: 'execution',
              },
              metadata: { testType: 'complex-prompt', difficulty: 'very-hard' },
            },
          ],
        },
        chatClient,
        evaluators: createRuleEvaluators({ inferenceClient }),
      });
      log.info('Edge case evaluation complete');
    });
  }
);
