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
} from '@kbn/test-suites-xpack-security/security_solution_api_integration/test_suites/entity_analytics/utils';
import { dataGeneratorFactory } from '@kbn/test-suites-xpack-security/security_solution_api_integration/test_suites/detections_response/utils';
import { evaluate } from '../../src/evaluate';

evaluate.describe('SIEM Entity Analytics Agent - Basic Tests', { tag: '@svlSecurity' }, () => {
  const userId = uuidv4();

  evaluate.beforeAll(async ({ log, esClient, esArchiverLoad, supertest, quickApiClient }) => {
    const { indexListOfDocuments } = dataGeneratorFactory({
      es: esClient,
      index: 'ecs_compliant',
      log,
    });
    const dataView = dataViewRouteHelpersFactory(supertest);
    await dataView.create('security-solution');
    await esArchiverLoad('ecs_compliant');

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

    // TODO
    //     // Order is critical here: auditbeat data must be loaded before attempting to start the ML job,
    // // as the job looks for certain indices on start
    // await kibanaServer.uiSettings.update({
    //   [DEFAULT_ANOMALY_SCORE]: 1,
    // });
    // await esArchiver.load(auditPath);
    // await setupMlModulesWithRetry({ module: siemModule, supertest, retry });
    // await forceStartDatafeeds({ jobId: mlJobId, rspCode: 200, supertest });
    // await esArchiver.load(
    //   'x-pack/solutions/security/test/fixtures/es_archives/security_solution/anomalies'
    // );
  });

  evaluate.afterAll(async ({ quickApiClient, supertest }) => {
    const dataView = dataViewRouteHelpersFactory(supertest);
    await dataView.delete('security-solution');
    await quickApiClient.cleanUpRiskEngine();
  });

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
        ],
      },
    });
  });

  evaluate('entity analytics risk score questions', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'siem-entity-analytics: [entity-analytics-tool-questions] risk score',
        description: 'Questions to test the SIEM Entity Analytics agent - risk score',
        examples: [
          {
            input: {
              question: 'Which users have the highest risk scores?',
            },
            output: {
              criteria: ['Return at least 5 users with the highest risk scores.'],
            },
            metadata: { query_intent: 'Factual' },
          },
          {
            input: {
              question: "Show me how user-1's risk score has changed over the last 90 days",
            },
            output: {
              criteria: ['Return the risk score of user-1 over the last 90 days.'],
            },
            metadata: { query_intent: 'Factual' },
          },
          {
            input: {
              question: 'Which 10 users have the highest risk scores right now?',
            },
            output: {
              criteria: ['Return the 10 users with the highest risk scores right now.'],
            },
            metadata: { query_intent: 'Factual' },
          },
        ],
      },
    });
  });

  evaluate('entity analytics anomalies questions', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'siem-entity-analytics: [entity-analytics-tool-questions] anomalies',
        description: 'Questions to test the SIEM Entity Analytics agent - anomalies',
        examples: [
          {
            input: {
              question: 'Show me entities with anomalous behavior in the last 24h',
            },
            output: {
              criteria: ['Return at least 5 entities with anomalous behavior in the last 24h.'],
            },
            metadata: { query_intent: 'Factual' },
          },
          {
            input: {
              question: 'Show users who downloaded unusually large data',
            },
            output: {
              criteria: ['Return the users who downloaded unusually large data.'],
            },
            metadata: { query_intent: 'Factual' },
          },
          {
            input: {
              question: 'Which accounts have downloaded more than 1GB this week?',
            },
            output: {
              criteria: ['Return the accounts that have downloaded more than 1GB this week.'],
            },
            metadata: { query_intent: 'Factual' },
          },
        ],
      },
    });
  });
});
