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

evaluate.describe(
  'SIEM Entity Analytics Skill - Risk Score Tests',
  { tag: tags.serverless.security.complete },
  () => {
    const userId = uuidv4();

    evaluate.beforeAll(async ({ log, esArchiverLoad, esClient: es, quickApiClient, supertest }) => {
      await createAlertsIndex(supertest, log);
      await esArchiverLoad(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
      );
      const dataView = dataViewRouteHelpersFactory(supertest);
      await dataView.create('security-solution', 'ecs_compliant,auditbeat-*');

      const { indexListOfDocuments } = dataGeneratorFactory({ es, index: 'ecs_compliant', log });
      const userDocs = Array(20)
        .fill({})
        .map((_, index) => buildDocument({ user: { name: `user-${index}` } }, userId));
      await indexListOfDocuments(userDocs);

      const createAndSyncRuleAndAlerts = createAndSyncRuleAndAlertsFactory({ supertest, log });
      await createAndSyncRuleAndAlerts({
        query: `id: ${userId}`,
        alerts: 10,
        riskScore: Math.floor(Math.random() * 100),
      });
      await quickApiClient.initRiskEngine();
      await waitForRiskScoresToBePresent({ es, log, scoreCount: 20 });
    });

    evaluate.afterAll(async ({ esClient, log, quickApiClient, supertest }) => {
      await quickApiClient.cleanUpRiskEngine();
      await deleteAllRiskScores(log, esClient);
      await deleteAllAlerts(supertest, log, esClient);
      await deleteAllRules(supertest, log);

      const dataView = dataViewRouteHelpersFactory(supertest);
      await dataView.delete('security-solution');
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
                    id: 'security.entity_analytics.risk_score',
                    criteria: [
                      `The tool should return the following ESQL query:
                      FROM risk-score.risk-score-latest-default
                      | WHERE user.risk.calculated_score_norm IS NOT NULL
                      | KEEP @timestamp, user.risk.calculated_score_norm, user.risk.calculated_level, user.risk.id_value, user.risk.id_field
                      | SORT user.risk.calculated_score_norm DESC

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
                criteria: [
                  'Return the risk score of user-1 over the last 90 days.',
                  'Return whether the change is significant or not significant',
                  'Return the reason for the significant change if there is a significant change',
                  'Return the risk level of user-1',
                ],
                toolCalls: [
                  {
                    id: 'security.entity_analytics.risk_score',
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
                    id: 'security.entity_analytics.risk_score',
                    criteria: [
                      `The tool should return the following ESQL query:
                      FROM risk-score.risk-score-latest-default
                      | WHERE user.risk.calculated_score_norm IS NOT NULL
                      | KEEP @timestamp, user.risk.calculated_score_norm, user.risk.calculated_level, user.risk.id_value, user.risk.id_field
                      | SORT user.risk.calculated_score_norm DESC
                      | LIMIT 15`,
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
