/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

const evaluate = base.extend<{ evaluateDataset: EvaluateDataset }, {}>({
  evaluateDataset: [
    ({ chatClient, evaluators, phoenixClient }, use) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          phoenixClient,
        })
      );
    },
    { scope: 'test' },
  ],
});

evaluate.describe('SIEM Entity Analytics Agent - Basic Tests', { tag: '@svlSecurity' }, () => {
  evaluate('basic security questions', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'siem-entity-analytics: basic-security-questions',
        description: 'Basic questions to test the SIEM Entity Analytics agent',
        examples: [
          {
            input: {
              question: 'What is your role?',
            },
            output: {
              criteria: [
                'Mentions security analyst or entity analytics expert',
                'Mentions Elastic Security',
                'Response is concise and on-topic',
              ],
            },
            metadata: { query_intent: 'Factual' },
          },
          {
            input: {
              question: 'Can you help me with entity analytics?',
            },
            output: {
              criteria: [
                'Confirms ability to help with entity analytics',
                'Response is helpful and professional',
                'Mentions security or Elastic Security context',
              ],
            },
            metadata: { query_intent: 'Procedural' },
          },
          {
            input: {
              question: 'What tools do you have access to?',
            },
            output: {
              criteria: [
                'Mentions entity-analytics-tool or security-related tools',
                'Response describes available capabilities',
                'Does not claim tools it does not have',
              ],
            },
            metadata: { query_intent: 'Factual' },
          },
        ],
      },
    });
  });

  evaluate('off-topic questions', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'siem-entity-analytics: off-topic-questions',
        description: 'Tests that the agent rejects off-topic questions',
        examples: [
          {
            input: {
              question: 'What is the weather today?',
            },
            output: {
              criteria: [
                'Politely declines to answer',
                'Mentions that the question is unrelated to security or Elastic Security',
                'Does not provide weather information',
              ],
            },
            metadata: { query_intent: 'Off-topic' },
          },
          {
            input: {
              question: 'Can you help me cook pasta?',
            },
            output: {
              criteria: [
                'Politely declines to answer',
                'Mentions focus on security or entity analytics',
                'Does not provide cooking instructions',
              ],
            },
            metadata: { query_intent: 'Off-topic' },
          },
        ],
      },
    });
  });
});

