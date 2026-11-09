/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { evaluate } from '../../src/evaluate';
import {
  bulkIndexEntities,
  deleteEntityEngines,
  deleteRiskScoreHistoryIndex,
  ensureRiskScoreDataStream,
  indexRiskScoreHistory,
  installEntityStoreV2AndWait,
} from '../../src/setup_helpers';

evaluate.describe(
  'SIEM Entity Analytics Skill - Risk Score Tests',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate.beforeAll(async ({ log, esClient, supertest }) => {
      await installEntityStoreV2AndWait({ supertest, log });
      await ensureRiskScoreDataStream({ supertest });
      await bulkIndexEntities({
        esClient,
        entities: Array.from({ length: 15 }, (_, index) => ({
          euid: `user:user-${index}`,
          riskScoreNorm: 95 - index * 5,
          riskLevel: index < 3 ? 'Critical' : index < 8 ? 'High' : 'Low',
        })),
      });
      const day = 24 * 60 * 60 * 1000;
      await indexRiskScoreHistory({
        esClient,
        entityType: 'user',
        entityId: 'user:user-1',
        points: [
          { timestamp: new Date(Date.now() - 60 * day).toISOString(), scoreNorm: 40, level: 'Low' },
          { timestamp: new Date(Date.now() - day).toISOString(), scoreNorm: 87, level: 'Critical' },
        ],
      });
    });

    evaluate.afterAll(async ({ esClient, log, supertest }) => {
      await deleteRiskScoreHistoryIndex({ esClient });
      await deleteEntityEngines({ supertest, log });
    });

    evaluate('entity analytics risk score questions', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics: risk score',
          description: 'Questions to test the SIEM Entity Analytics skill - risk score',
          examples: [
            {
              input: {
                question: 'Which users have the highest risk scores?',
              },
              output: {
                criteria: [
                  'Return 10 users with the highest risk scores.',
                  'Return the risk scores of those users.',
                  'Return the risk levels of those users.',
                  'Return the criticality of these users',
                ],
                toolCalls: [
                  {
                    id: 'security.search_entities',
                    criteria: [
                      'The tool searches entities and orders them by risk score descending.',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: "Show me how user-1's risk score has changed over the last 90 days",
              },
              output: {
                criteria: [
                  'Return the risk score of user-1 over the last 90 days.',
                  'Return whether the change is significant or not significant',
                  'Return the reason for the significant change if there is a significant change',
                  'Return the risk level of user-1',
                ],
                toolCalls: [
                  {
                    id: 'security.get_entity_risk_score_history',
                    criteria: ['The tool requests risk score history for user-1.'],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Which 15 users have the highest risk scores right now?',
              },
              output: {
                criteria: [
                  'Return 15 users with the highest risk scores.',
                  'Return the risk scores of those users.',
                  'Return the risk levels of those users.',
                  'Return the criticality of these users',
                ],
                toolCalls: [
                  {
                    id: 'security.search_entities',
                    criteria: [
                      'The tool searches entities, orders them by risk score descending, and limits the result to 15.',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
          ],
        },
      });
    });
  }
);
