/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
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

evaluate.describe('SIEM Entity Analytics Agent - Risk Score Tests', { tag: '@svlSecurity' }, () => {
  const userId = uuidv4();

  evaluate.beforeAll(async ({ log, esArchiverLoad, supertest, kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await createAlertsIndex(supertest, log);
    await esArchiverLoad(
      'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
    );
    const dataView = dataViewRouteHelpersFactory(supertest);
    await dataView.create('security-solution', 'ecs_compliant,auditbeat-*');
  });

  evaluate.afterAll(async ({ kbnClient, supertest }) => {
    const dataView = dataViewRouteHelpersFactory(supertest);
    await dataView.delete('security-solution');
    await kbnClient.savedObjects.cleanStandardList();
  });

  evaluate.describe('without data', () => {
    evaluate('entity analytics risk score questions', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics: risk score without data',
          description:
            'Questions to test the SIEM Entity Analytics agent - risk score without data',
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
                toolCalls: [
                  {
                    id: 'security.entity_analytics.threat_hunting',
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
                  'Return that risk engine is not enabled in this environment.',
                  'Show the current status as DISABLED',
                  'Prompt the user to enable the risk engine',
                ],
                toolCalls: [
                  {
                    id: 'security.entity_analytics.threat_hunting',
                  },
                ],
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
                  'Show the current status as DISABLED',
                  'Prompt the user to enable the risk engine',
                ],
                toolCalls: [
                  {
                    id: 'security.entity_analytics.threat_hunting',
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
          ],
        },
      });
    });
  });

  evaluate.describe('with risk score data', () => {
    evaluate.beforeAll(
      async ({ log, esClient, esArchiverLoad, supertest, quickApiClient, kbnClient, config }) => {
        const { indexListOfDocuments } = dataGeneratorFactory({
          es: esClient,
          index: 'ecs_compliant', // Index to populate risk score
          log,
        });
        const userDocs = Array(10)
          .fill({})
          .map((_, index) => buildDocument({ user: { name: `user-${index}` } }, userId));
        await indexListOfDocuments(userDocs);
        const createAndSyncRuleAndAlerts = createAndSyncRuleAndAlertsFactory({
          supertest,
          log,
        });
        await createAndSyncRuleAndAlerts({
          query: `id: ${userId}`,
          alerts: 10,
          riskScore: 40,
        });
        await quickApiClient.initRiskEngine();
        await waitForRiskScoresToBePresent({ es: esClient, log, scoreCount: 10 });
      }
    );

    evaluate.afterAll(async ({ quickApiClient, supertest, kbnClient, log, esClient }) => {
      await quickApiClient.cleanUpRiskEngine();
      await deleteAllRiskScores(log, esClient);
      await deleteAllAlerts(supertest, log, esClient);
      await deleteAllRules(supertest, log);
    });

    evaluate('entity analytics risk score questions', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics: risk score',
          description: 'Questions to test the SIEM Entity Analytics agent - risk score',
          examples: [
            {
              input: {
                question: 'Which users have the highest risk scores?',
              },
              output: {
                criteria: ['Return at least 5 users with the highest risk scores.'],
                toolCalls: [
                  {
                    id: 'security.entity_analytics.threat_hunting',
                    criteria: [
                      `The tool should return the following ESQL query:
                      FROM risk-score.risk-score-latest-default
                      | WHERE user.name IS NOT NULL
                      | SORT user.risk.calculated_score_norm DESC
                      | KEEP user.name, user.risk.calculated_score_norm, user.risk.calculated_level

                      Don't fail the assertion if the query has limit.
                      `,
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
                criteria: ['Return the risk score of user-1 over the last 90 days.'],
                toolCalls: [
                  {
                    id: 'security.entity_analytics.threat_hunting',
                    criteria: [
                      `The tool should return an ESQL query with the following structure:
                      * FROM index: risk-score.risk-score-default
                      * Filter by: @timestamp >= NOW() - 90 days
                      * Filter by: user.name == "user-1"
                      `,
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Which 10 users have the highest risk scores right now?',
              },
              output: {
                criteria: ['Return the 10 users with the highest risk scores right now.'],
                toolCalls: [
                  {
                    id: 'security.entity_analytics.threat_hunting',
                    criteria: [
                      `The tool should return the following ESQL query:
                      FROM risk-score.risk-score-latest-default
                      | WHERE user.name IS NOT NULL
                      | SORT user.risk.calculated_score_norm DESC
                      | KEEP user.name, user.risk.calculated_score_norm, user.risk.calculated_level
                      | LIMIT 10`,
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
  });
});
