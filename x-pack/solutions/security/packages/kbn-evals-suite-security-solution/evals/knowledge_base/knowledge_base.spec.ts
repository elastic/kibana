/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate } from '../../src/evaluate';
import { customKnowledgeDataset } from '../../datasets';

/**
 * Criteria for evaluating Custom Knowledge responses
 * Based on evaluators/assistant_eval_custom_knowledge.md
 */
const CUSTOM_KNOWLEDGE_CRITERIA = [
  'Is the submission non-empty and not null?',
  'Is the submission value fairly similar to the reference value?',
];

evaluate.describe('Security KB', { tag: '@svlSecurity' }, () => {
  evaluate.beforeAll(async ({ knowledgeBaseClient }) => {
    await knowledgeBaseClient.ensureInstalled();
  });

  evaluate('custom knowledge', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: customKnowledgeDataset.name,
        description: customKnowledgeDataset.description,
        examples: customKnowledgeDataset.examples.map((example) => ({
          input: { question: example.input.question },
          output: {
            reference: example.output.reference,
            criteria: CUSTOM_KNOWLEDGE_CRITERIA,
          },
        })),
      },
    });
  });
});
