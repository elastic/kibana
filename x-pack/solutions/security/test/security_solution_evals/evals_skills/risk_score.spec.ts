/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Agent as SupertestAgent } from 'supertest';
import { buildDocument } from '@kbn/test-suites-security-solution-apis/test_suites/entity_analytics/utils';
import { dataGeneratorFactory } from '@kbn/test-suites-security-solution-apis/test_suites/detections_response/utils';
import { createAlertsIndex } from '@kbn/detections-response-ftr-services/alerts';

import { evaluate } from '../src/evaluate';
import { oneChatDefaultAgentId } from '@kbn/onechat-common';

const AGENT_ID = oneChatDefaultAgentId;

async function ensureDataView({
  supertest,
  id,
  title,
}: {
  supertest: SupertestAgent;
  id: string;
  title: string;
}) {
  const getRes = await supertest.get(`/api/data_views/data_view/${id}`);
  if (getRes.status === 200) {
    return;
  }
  if (getRes.status !== 404) {
    throw new Error(`Unexpected status when checking data view '${id}': ${getRes.status}`);
  }

  await supertest
    .post(`/api/data_views/data_view`)
    .set('kbn-xsrf', 'foo')
    .send({
      data_view: {
        title,
        timeFieldName: '@timestamp',
        name: id,
        id,
      },
    })
    .expect(200);
}

async function updateDataViewTitle({
  supertest,
  id,
  title,
}: {
  supertest: SupertestAgent;
  id: string;
  title: string;
}) {
  await supertest
    .post(`/api/data_views/data_view/${id}`)
    .set('kbn-xsrf', 'foo')
    .send({
      data_view: {
        title,
      },
    })
    .expect(200);
}

evaluate.describe(
  'Security Entity Analytics (Skills) - Risk Scores',
  { tag: '@svlSecurity' },
  () => {
    const userId = uuidv4();

    evaluate.beforeAll(async ({ log, esArchiverLoad, supertest }) => {

      await createAlertsIndex(supertest, log);
      await esArchiverLoad(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
      );
      await ensureDataView({ supertest, id: 'security-solution', title: 'logs-*' });
      await updateDataViewTitle({ supertest, id: 'security-solution', title: 'ecs_compliant,auditbeat-*' });
    });

    // evaluate.afterAll(async ({ kbnClient, supertest, log }) => {
    //   const dataView = dataViewRouteHelpersFactory(supertest);
    //   await dataView.delete('security-solution');
    //   await cleanStandardListExceptAction(kbnClient);
    // });

    evaluate.describe('without data', () => {
      evaluate(
        'entity analytics risk score questions (skills) - without data',
        async ({ evaluateDataset }) => {
          await evaluateDataset({
            dataset: {
              name: 'entity-analytics-skills: risk score without data',
              description:
                'Risk score questions validated via OneAgent skills (risk engine disabled)',
              agentId: AGENT_ID,
              examples: [
                {
                  input: { question: 'Which users have the highest risk scores?' },
                  output: {
                    criteria: [
                      'Return that risk engine is not enabled in this environment.',
                      'Show the current status as DISABLED',
                      'Prompt the user to enable the risk engine',
                    ],
                    toolCalls: [
                      {
                        id: 'invoke_skill',
                        criteria: [
                          'The agent should invoke the skill tool "entity_analytics_get_risk_scores".',
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
                      'Return that risk engine is not enabled in this environment.',
                      'Show the current status as DISABLED',
                      'Prompt the user to enable the risk engine',
                    ],
                    toolCalls: [
                      {
                        id: 'invoke_skill',
                        criteria: [
                          'The agent should invoke the skill tool "entity_analytics_get_risk_score_time_series".',
                        ],
                      },
                    ],
                  },
                  metadata: { query_intent: 'Factual' },
                },
                {
                  input: { question: 'Which 10 users have the highest risk scores right now?' },
                  output: {
                    criteria: [
                      'Return that risk engine is not enabled in this environment.',
                      'Show the current status as DISABLED',
                      'Prompt the user to enable the risk engine',
                    ],
                    toolCalls: [
                      {
                        id: 'invoke_skill',
                        criteria: [
                          'The agent should invoke the skill tool "entity_analytics_get_risk_scores".',
                        ],
                      },
                    ],
                  },
                  metadata: { query_intent: 'Factual' },
                },
              ],
            },
          });
        }
      );
    });

    evaluate.describe('with risk score data', () => {
      evaluate.beforeAll(async ({ log, esClient, supertest, spaceId }) => {
        const { indexListOfDocuments } = dataGeneratorFactory({
          es: esClient,
          index: 'ecs_compliant', // Index to populate risk score
          log,
        });

        const userDocs = Array(10)
          .fill({})
          .map((_, index) => buildDocument({ user: { name: `user-${index}` } }, userId));
        await indexListOfDocuments(userDocs);

        /**
         * In this eval suite we run against Scout's stateful config which mimics serverless RBAC.
         * The default basic-auth user may not have alerting rule-type privileges in non-default spaces,
         * causing rule creation (and therefore risk engine-derived scores) to fail with 403.
         *
         * To keep this evaluation deterministic and space-parallel-safe, we seed risk score indices
         * directly with minimal documents the `entity_analytics_*` skills query.
         */
        const latestIndex = `risk-score.risk-score-latest-${spaceId}`;
        const timeSeriesIndex = `risk-score.risk-score-${spaceId}`;

        await esClient.indices.create({ index: latestIndex }, { ignore: [400] });
        await esClient.indices.create({ index: timeSeriesIndex }, { ignore: [400] });

        const now = new Date();
        const nowIso = now.toISOString();
        const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

        const makeUserRisk = (name: string, ts: string, scoreNorm: number) => {
          const level =
            scoreNorm >= 75 ? 'High' : scoreNorm >= 50 ? 'Moderate' : scoreNorm >= 25 ? 'Low' : 'Unknown';
          return {
            '@timestamp': ts,
            id_field: 'user.name',
            id_value: name,
            calculated_level: level,
            calculated_score: scoreNorm,
            calculated_score_norm: scoreNorm,
            category_1_score: scoreNorm,
            category_1_count: 1,
            inputs: [],
            notes: [],
            modifiers: [],
          };
        };

        const bulkBody: Array<Record<string, unknown>> = [];

        // Seed latest index with top risky users
        for (let i = 0; i < 10; i++) {
          const name = `user-${i}`;
          const score = 95 - i * 5; // descending
          bulkBody.push({ index: { _index: latestIndex } });
          bulkBody.push({
            '@timestamp': nowIso,
            user: { name, risk: makeUserRisk(name, nowIso, score) },
          });
        }

        // Seed time-series index with multiple points for user-1 over ~90 days
        const series = [
          { ts: daysAgo(90), score: 15 },
          { ts: daysAgo(45), score: 55 },
          { ts: daysAgo(1), score: 85 },
        ];
        for (const { ts, score } of series) {
          bulkBody.push({ index: { _index: timeSeriesIndex } });
          bulkBody.push({
            '@timestamp': ts,
            user: { name: 'user-1', risk: makeUserRisk('user-1', ts, score) },
          });
        }

        // Add at least one extra entity to time-series index so wildcard queries have data there too
        bulkBody.push({ index: { _index: timeSeriesIndex } });
        bulkBody.push({
          '@timestamp': nowIso,
          user: { name: 'user-0', risk: makeUserRisk('user-0', nowIso, 90) },
        });

        const bulkRes = await esClient.bulk({ refresh: 'wait_for', operations: bulkBody as any });
        if (bulkRes.errors) {
          log.warning(`Risk score seed bulk had errors: ${JSON.stringify(bulkRes.items).slice(0, 2000)}`);
        }
      });

      // evaluate.afterAll(async ({ quickApiClient, supertest, log, esClient }) => {
      //   await quickApiClient.cleanUpRiskEngine();
      //   await deleteAllRiskScores(log, esClient);
      //   await deleteAllAlerts(supertest, log, esClient);
      //   await deleteAllRules(supertest, log);
      // });

      evaluate('top risky users (skills)', async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-skills: risk score',
            description: 'Risk score questions validated via OneAgent skills',
            agentId: AGENT_ID,
            examples: [
              {
                input: { question: 'Which users have the highest risk scores?' },
                output: {
                  criteria: [
                    'Returns at least 5 users',
                    'Mentions risk scores (0-100 normalized or equivalent)',
                  ],
                  toolCalls: [
                    {
                      id: 'invoke_skill',
                      criteria: [
                        'The agent should invoke the skill tool "entity_analytics_get_risk_scores".',
                        'The invocation should use identifierType "user" and identifier "*".',
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
                  criteria: ['Mentions risk score changes over time', 'Mentions user-1'],
                  toolCalls: [
                    {
                      id: 'invoke_skill',
                      criteria: [
                        'The agent should invoke the skill tool "entity_analytics_get_risk_score_time_series".',
                        'The invocation should use identifierType "user" and identifier "user-1".',
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: { question: 'Which 10 users have the highest risk scores right now?' },
                output: {
                  criteria: ['Mentions top risky users', 'Mentions risk scores'],
                  toolCalls: [
                    {
                      id: 'invoke_skill',
                      criteria: [
                        'The agent should invoke the skill tool "entity_analytics_get_risk_scores".',
                        'The invocation should use identifierType "user" and identifier "*".',
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
  }
);
