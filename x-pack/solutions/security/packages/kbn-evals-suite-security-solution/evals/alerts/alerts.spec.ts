/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate } from '../../src/evaluate';
import { alertsRagRegressionDataset } from '../../datasets';

/**
 * Criteria for evaluating Alerts RAG responses
 * Based on evaluators/alerts_rag_regression.md
 */
const ALERTS_RAG_CRITERIA = [
  'Is the submission non-empty and not null?',
  'Does the submission capture the essence of the reference?',
  'If the input asks about counts of alerts, do the numerical values in the submission equal the values provided in the reference?',
  'If the input asks about entities, such as host names or user names, do the entity values in submission equal at least 70% of the values provided in the reference?',
];

evaluate.describe('Security Alerts RAG', { tag: '@svlSecurity' }, () => {
  evaluate('alerts rag regression (episodes 1-8)', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: alertsRagRegressionDataset.name,
        description: alertsRagRegressionDataset.description,
        examples: alertsRagRegressionDataset.examples.map((example) => ({
          input: { question: example.input.question },
          output: {
            reference: example.output.reference,
            criteria: ALERTS_RAG_CRITERIA,
          },
        })),
      },
    });
  });
});
