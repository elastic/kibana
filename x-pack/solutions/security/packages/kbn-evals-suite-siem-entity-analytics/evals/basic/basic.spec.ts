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
} from '@kbn/test-suites-xpack-security/security_solution_api_integration/test_suites/entity_analytics/utils';
import { DEFAULT_ANOMALY_SCORE } from '@kbn/security-solution-plugin/common/constants';
import { EsArchivePathBuilder } from '@kbn/test-suites-xpack-security/security_solution_api_integration/es_archive_path_builder';
import { deleteAllRules } from '@kbn/test-suites-xpack-security/security_solution_api_integration/config/services/detections_response/rules';
import { dataGeneratorFactory } from '@kbn/test-suites-xpack-security/security_solution_api_integration/test_suites/detections_response/utils';
import {
  deleteAllAlerts,
  createAlertsIndex,
} from '@kbn/test-suites-xpack-security/security_solution_api_integration/config/services/detections_response/alerts';
import {
  setupMlModulesWithRetry,
  forceStartDatafeeds,
  installIntegrationAndCreatePolicy,
  deleteMLJobs,
} from '../../src/helpers/ml';
import { evaluate } from '../../src/evaluate';

evaluate.describe('SIEM Entity Analytics Agent - Basic Tests2', { tag: '@svlSecurity' }, () => {
  let agentPolicyId: string;
  let packagePolicyId: string;
  const userId = uuidv4();
  const mlModule = 'ded-ml';
  const mlJobIds = [
    'ded_high_bytes_written_to_external_device',
    'ded_high_bytes_written_to_external_device_airdrop',
    'ded_high_sent_bytes_destination_geo_country_iso_code',
    'ded_high_sent_bytes_destination_ip',
  ];

  evaluate.beforeAll(
    async ({ log, esClient, esArchiverLoad, supertest, quickApiClient, kbnClient, config }) => {
      await kbnClient.savedObjects.cleanStandardList();
      await createAlertsIndex(supertest, log);
      await esArchiverLoad(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
      );
      const dataView = dataViewRouteHelpersFactory(supertest);
      await dataView.create('security-solution', 'ecs_compliant,auditbeat-*');
    }
  );

  evaluate.afterAll(async ({ kbnClient, supertest }) => {
    const dataView = dataViewRouteHelpersFactory(supertest);
    await dataView.delete('security-solution');
    await kbnClient.savedObjects.cleanStandardList();
  });

  evaluate.describe('without data', () => {
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
                  'Mentions entity analytics',
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
          name: 'siem-entity-analytics: [entity-analytics-tool-questions] risk score without data',
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
                    id: 'entity-analytics-tool',
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
                    id: 'entity-analytics-tool',
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
                    id: 'entity-analytics-tool',
                  },
                ],
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
          name: 'siem-entity-analytics: [entity-analytics-tool-questions] anomalies without data',
          description: 'Questions to test the SIEM Entity Analytics agent - anomalies without data',
          examples: [
            {
              input: {
                question: 'Show me entities with anomalous behavior in the last 24 hours',
              },
              output: {
                criteria: [
                  'Return that the required anomaly detection jobs are not enabled in this environment.',
                  'Prompt the user to enable anomaly detection jobs',
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Show users who downloaded unusually large data',
              },
              output: {
                criteria: [
                  'Return that the required anomaly detection jobs are not enabled in this environment.',
                  'Prompt the user to enable anomaly detection jobs',
                  `Mention at least 2 jobs ids: ${mlJobIds.join(', ')}`,
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
          ],
        },
      });
    });
  });

  evaluate.describe('with risk score and anomalies data', () => {
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
        await kbnClient.uiSettings.update({
          [DEFAULT_ANOMALY_SCORE]: 1,
        });
        const dataPathBuilder = new EsArchivePathBuilder(config.serverless);
        const auditPath = dataPathBuilder.getPath('auditbeat/hosts');
        await esArchiverLoad(auditPath); // Index required to start the ML jobs and
        const { agentPolicyId: newAgentPolicyId, packagePolicyId: newPackagePolicyId } =
          await installIntegrationAndCreatePolicy({
            kbnClient,
            supertest,
            log,
            integrationName: 'ded',
          });
        agentPolicyId = newAgentPolicyId;
        packagePolicyId = newPackagePolicyId;

        const mlModules = await setupMlModulesWithRetry({ module: mlModule, supertest });
        log.debug('Setup ML modules response: ', JSON.stringify(mlModules, null, 2));
        const df = await forceStartDatafeeds({ jobIds: mlJobIds, rspCode: 200, supertest });
        log.debug('Force start DataFeeds response: ', JSON.stringify(df, null, 2));
        await esArchiverLoad(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/data_exfiltration_anomalies' // Load anomalies
        );
      }
    );

    evaluate.afterAll(async ({ quickApiClient, supertest, kbnClient, log, esClient }) => {
      await supertest
        .post(`/api/fleet/agent_policies/delete`)
        .set('kbn-xsrf', 'xxxx')
        .send({ agentPolicyId });
      await supertest
        .post(`/api/fleet/package_policies/delete`)
        .set('kbn-xsrf', 'xxxx')
        .send({ packagePolicyIds: [packagePolicyId] });
      await deleteMLJobs({ jobIds: mlJobIds, supertest });
      await quickApiClient.cleanUpRiskEngine();
      await deleteAllRiskScores(log, esClient);
      await deleteAllAlerts(supertest, log, esClient);
      await deleteAllRules(supertest, log);
      await kbnClient.uiSettings.update({
        [DEFAULT_ANOMALY_SCORE]: 50,
      });
    });

    evaluate.only('entity analytics risk score questions', async ({ evaluateDataset }) => {
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
                toolCalls: [
                  {
                    id: 'entity-analytics-tool',
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
                    id: 'entity-analytics-tool',
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
                    id: 'entity-analytics-tool',
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

    evaluate('entity analytics anomalies questions', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'siem-entity-analytics: [entity-analytics-tool-questions] anomalies',
          description: 'Questions to test the SIEM Entity Analytics agent - anomalies',
          examples: [
            {
              input: {
                question: 'Show me entities with anomalous behavior in the last 1000 years', // it suppose to be 24h, but mocked anomalies timestamp are hardcoded
              },
              output: {
                criteria: [
                  'Return at least 4 entities with anomalous behavior',
                  `Mention at least 2 jobs ids: ${mlJobIds.join(', ')}`,
                ],
                toolCalls: [
                  {
                    id: 'entity-analytics-tool',
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Show users who downloaded unusually large data',
              },
              output: {
                criteria: [
                  'Return the users who downloaded unusually large data.',
                  `Mention at least 2 jobs ids: ${mlJobIds.join(', ')}`,
                ],
                toolCalls: [
                  {
                    id: 'entity-analytics-tool',
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
