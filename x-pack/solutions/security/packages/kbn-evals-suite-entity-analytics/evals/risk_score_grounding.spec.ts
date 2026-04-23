/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { tags } from '@kbn/scout-security';
import {
  buildDocument,
  createAndSyncRuleAndAlertsFactory,
  waitForRiskScoresToBePresent,
  dataViewRouteHelpersFactory,
  deleteAllRiskScores,
} from '@kbn/test-suites-security-solution-apis/test_suites/entity_analytics/utils';
import { deleteAllRules } from '@kbn/detections-response-ftr-services/rules';
import { dataGeneratorFactory } from '@kbn/test-suites-security-solution-apis/test_suites/detections_response/utils';
import { deleteAllAlerts, createAlertsIndex } from '@kbn/detections-response-ftr-services/alerts';
import { evaluate } from '../src/evaluate';

/**
 * Risk score grounding evals with deterministic seeded data.
 *
 * Unlike risk_score_engine_on.spec.ts which uses random scores, this spec seeds
 * three users with deliberately different risk profiles so criteria can assert
 * exact entity names, correct risk levels, and relative ordering. The risk engine
 * normalizes alert-level scores using weighted aggregation, so we use high-contrast
 * inputs to ensure each user lands in a distinct risk level bucket:
 *
 *   eval-alice  — riskScore=99, 50 alerts → Critical
 *   eval-bob    — riskScore=70, 15 alerts → High
 *   eval-carol  — riskScore=25,  2 alerts → Low
 */
evaluate.describe(
  'SIEM Entity Analytics Skill - Risk Score Grounding',
  { tag: tags.serverless.security.complete },
  () => {
    const aliceId = uuidv4();
    const bobId = uuidv4();
    const carolId = uuidv4();

    evaluate.beforeAll(async ({ log, esArchiverLoad, esClient: es, quickApiClient, supertest }) => {
      await createAlertsIndex(supertest, log);
      await esArchiverLoad(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
      );
      const dataView = dataViewRouteHelpersFactory(supertest);
      await dataView.create('security-solution', 'ecs_compliant');

      const { indexListOfDocuments } = dataGeneratorFactory({
        es,
        index: 'ecs_compliant',
        log,
      });

      // Seed deterministic documents for each user
      const aliceDocs = Array(50)
        .fill({})
        .map(() => buildDocument({ user: { name: 'eval-alice' } }, aliceId));
      const bobDocs = Array(15)
        .fill({})
        .map(() => buildDocument({ user: { name: 'eval-bob' } }, bobId));
      const carolDocs = Array(2)
        .fill({})
        .map(() => buildDocument({ user: { name: 'eval-carol' } }, carolId));

      await indexListOfDocuments([...aliceDocs, ...bobDocs, ...carolDocs]);

      const createAndSyncRuleAndAlerts = createAndSyncRuleAndAlertsFactory({ supertest, log });

      // Create rules with distinct risk scores for each user
      await createAndSyncRuleAndAlerts({
        query: `id: ${aliceId}`,
        alerts: 50,
        riskScore: 99,
      });
      await createAndSyncRuleAndAlerts({
        query: `id: ${bobId}`,
        alerts: 15,
        riskScore: 70,
      });
      await createAndSyncRuleAndAlerts({
        query: `id: ${carolId}`,
        alerts: 2,
        riskScore: 25,
      });

      await quickApiClient.initRiskEngine();
      await waitForRiskScoresToBePresent({ es, log, scoreCount: 3 });
    });

    evaluate.afterAll(async ({ esClient, log, quickApiClient, supertest }) => {
      await quickApiClient.cleanUpRiskEngine();
      await deleteAllRiskScores(log, esClient);
      await deleteAllAlerts(supertest, log, esClient);
      await deleteAllRules(supertest, log);

      const dataView = dataViewRouteHelpersFactory(supertest);
      await dataView.delete('security-solution');
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
                    id: 'security.entity_analytics.risk_score',
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
                    id: 'security.entity_analytics.risk_score',
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
                    id: 'security.entity_analytics.risk_score',
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
                    id: 'security.entity_analytics.risk_score',
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
                    id: 'security.entity_analytics.risk_score',
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
                    id: 'security.entity_analytics.risk_score',
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
