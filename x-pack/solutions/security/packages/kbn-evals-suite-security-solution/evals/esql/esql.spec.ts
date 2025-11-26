/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate } from '../../src/evaluate';
import { esqlGenerationDataset } from '../../datasets';

/**
 * Criteria for evaluating ES|QL generation responses
 * Based on evaluators/esql_generation_regression.md
 */
const ESQL_GENERATION_CRITERIA = [
  'Is the submission non-empty and not null?',
  'Is the ES|QL query part of the submission valid ES|QL syntax? Remember that valid ES|QL syntax should begin with the keyword "from" or "FROM". Remember that "GROK" and "DISSECT" are valid ES|QL functions. Remember that "BUCKET" is a valid ES|QL function.',
  'Is the human explanation of the ES|QL query similar between the submission and the reference?',
];

evaluate.describe('Security ES|QL', { tag: '@svlSecurity' }, () => {
  evaluate('esql generation regression suite', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: esqlGenerationDataset.name,
        description: esqlGenerationDataset.description,
        examples: esqlGenerationDataset.examples.map((example) => ({
          input: { question: example.input.question },
          output: {
            reference: example.output.reference,
            criteria: ESQL_GENERATION_CRITERIA,
          },
        })),
      },
    });
  });
});
