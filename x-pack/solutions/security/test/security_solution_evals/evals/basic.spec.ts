/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataViewRouteHelpersFactory } from '@kbn/test-suites-security-solution-apis/test_suites/entity_analytics/utils';
import { createAlertsIndex } from '@kbn/detections-response-ftr-services/alerts';

import { evaluate } from '../src/evaluate';
import {
  createEntityAnalyticsTestAgent,
  deleteEntityAnalyticsTestAgent,
} from '../src/helpers/agent';

const AGENT_ID = 'test_agent';

evaluate.describe('SIEM Entity Analytics Agent - Basic Tests', { tag: '@svlSecurity' }, () => {
  evaluate.beforeAll(async ({ log, esArchiverLoad, supertest }) => {
    await createAlertsIndex(supertest, log);
    await esArchiverLoad(
      'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
    );
    const dataView = dataViewRouteHelpersFactory(supertest);
    await dataView.create('security-solution', 'ecs_compliant,auditbeat-*');
    await createEntityAnalyticsTestAgent({ agentId: AGENT_ID, supertest, log });
  });

  evaluate.afterAll(async ({ supertest, log }) => {
    const dataView = dataViewRouteHelpersFactory(supertest);
    await dataView.delete('security-solution');
    await deleteEntityAnalyticsTestAgent({ agentId: AGENT_ID, supertest, log });
  });

  evaluate.describe('without data', () => {
    evaluate('basic security questions', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics: basic-security-questions',
          description: 'Basic questions to test the SIEM Entity Analytics agent',
          agentId: AGENT_ID,
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
  });
});
