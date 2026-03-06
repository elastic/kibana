/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { evaluate } from '../src/evaluate';

evaluate.describe(
  'SIEM Entity Analytics Skill - Risk Score Tests Without Data',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate('entity analytics risk score questions', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics: risk score without data',
          description:
            'Questions to test the SIEM Entity Analytics skill - risk score without data',
          examples: [
            {
              input: {
                question: 'Which users have the highest risk scores?',
              },
              output: {
                criteria: [
                  'Return that risk engine is not enabled in this environment.',
                  'Show the current status as DISABLED',
                  'Prompt the user to enable the risk engine',
                ],
                toolCalls: [{ id: 'security.entity_analytics.risk_score' }],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: "Show me how user-1's risk score has changed over the last 90 days",
              },
              output: {
                criteria: [
                  'Return that risk engine is not enabled in this environment.',
                  'Show the current status as DISABLED',
                  'Prompt the user to enable the risk engine',
                ],
                toolCalls: [{ id: 'security.entity_analytics.risk_score' }],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Which 10 users have the highest risk scores right now?',
              },
              output: {
                criteria: [
                  'Return that risk engine is not enabled in this environment.',
                  'Prompt the user to enable the risk engine',
                ],
                toolCalls: [{ id: 'security.entity_analytics.risk_score' }],
              },
              metadata: { query_intent: 'Factual' },
            },
          ],
        },
      });
    });
  }
);
