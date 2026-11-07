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
  installEntityStoreV2AndWait,
} from '../../src/setup_helpers';

/**
 * Grounding evals for three seeded users. Scores are written onto the entity
 * documents, so the ranking does not depend on the risk engine:
 *
 *   user:eval-alice: 99, Critical
 *   user:eval-bob: 70, High
 *   user:eval-carol: 25, Low
 */
evaluate.describe(
  'SIEM Entity Analytics Skill - Risk Score Grounding',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate.beforeAll(async ({ log, esClient, supertest }) => {
      await installEntityStoreV2AndWait({ supertest, log });
      await bulkIndexEntities({
        esClient,
        entities: [
          { euid: 'user:eval-alice', riskScoreNorm: 99, riskLevel: 'Critical' },
          { euid: 'user:eval-bob', riskScoreNorm: 70, riskLevel: 'High' },
          { euid: 'user:eval-carol', riskScoreNorm: 25, riskLevel: 'Low' },
        ],
      });
    });

    evaluate.afterAll(async ({ log, supertest }) => {
      await deleteEntityEngines({ supertest, log });
    });

    evaluate('risk score grounding: known entities', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics: risk score grounding',
          description:
            'Grounding evals asserting exact entity names and risk levels from seeded data',
          examples: [
            {
              input: {
                question: 'Which users have the highest risk scores?',
              },
              output: {
                criteria: [
                  'The response must include the user "eval-alice" as the highest-risk user.',
                  'The response must include the user "eval-bob".',
                  'The user "eval-alice" must have a higher risk score than "eval-bob".',
                  'The user "eval-bob" must have a higher risk score than "eval-carol".',
                  'Do not include user names that were not seeded (no hallucinated entity names).',
                ],
                toolCalls: [
                  {
                    id: 'security.search_entities',
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'What is the risk level for user eval-alice?',
              },
              output: {
                criteria: [
                  'The response must mention "eval-alice" by name.',
                  'The response must report eval-alice as having a Critical risk level.',
                  'Do not fabricate risk score values or risk inputs.',
                ],
                toolCalls: [
                  {
                    id: 'security.search_entities',
                    criteria: ['The tool query filters by or references user "eval-alice".'],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'What is the risk level for user eval-bob?',
              },
              output: {
                criteria: [
                  'The response must mention "eval-bob" by name.',
                  'The response must report eval-bob as having a High risk level.',
                  'Do not fabricate risk score values or risk inputs.',
                ],
                toolCalls: [
                  {
                    id: 'security.search_entities',
                    criteria: ['The tool query filters by or references user "eval-bob".'],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'What is the risk level for user eval-carol?',
              },
              output: {
                criteria: [
                  'The response must mention "eval-carol" by name.',
                  'The response must report eval-carol as having a Low risk level.',
                  'Do not fabricate risk score values or risk inputs.',
                ],
                toolCalls: [
                  {
                    id: 'security.search_entities',
                    criteria: ['The tool query filters by or references user "eval-carol".'],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Show me all Critical risk users',
              },
              output: {
                criteria: [
                  'The response must include "eval-alice" as a Critical risk user.',
                  'The response must NOT include "eval-bob" or "eval-carol" as Critical risk users.',
                  'Do not hallucinate entity names that were not seeded.',
                ],
                toolCalls: [
                  {
                    id: 'security.search_entities',
                    criteria: [
                      'The tool query filters by Critical risk level or sorts by risk score descending.',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Compare the risk profiles of eval-alice, eval-bob, and eval-carol',
              },
              output: {
                criteria: [
                  'The response must mention all three users: eval-alice, eval-bob, and eval-carol.',
                  'The response must correctly rank them: eval-alice (Critical) > eval-bob (High) > eval-carol (Low).',
                  'The response must report distinct risk levels for each user, not the same level for all.',
                  'Do not fabricate risk score values or risk inputs.',
                ],
                toolCalls: [
                  {
                    id: 'security.search_entities',
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
