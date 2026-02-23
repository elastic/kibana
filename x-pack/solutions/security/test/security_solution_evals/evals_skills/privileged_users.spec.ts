/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrivilegedMonitorUsersIndex } from '@kbn/security-solution-plugin/common/entity_analytics/privileged_user_monitoring/utils';
import { evaluate } from '../src/evaluate';
import { cleanStandardListExceptAction } from '../src/helpers/saved_objects_cleanup';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';

const AGENT_ID = agentBuilderDefaultAgentId;

evaluate.describe(
  'Security Entity Analytics (Skills) - Privileged Users',
  { tag: '@svlSecurity' },
  () => {
    evaluate.beforeAll(async ({ kbnClient }) => {
      await cleanStandardListExceptAction(kbnClient);
    });

    evaluate.afterAll(async ({ kbnClient }) => {
      await cleanStandardListExceptAction(kbnClient);
    });

    evaluate.describe('with privileged users data', () => {
      evaluate.beforeAll(async ({ esClient, spaceId }) => {
        await esClient.index({
          index: getPrivilegedMonitorUsersIndex(spaceId),
          document: {
            '@timestamp': new Date().toISOString(),
            user: { name: 'admin-service-account', is_privileged: true },
            labels: { sources: ['api'] },
          },
          refresh: 'wait_for',
        });
      });

      evaluate.afterAll(async ({ esClient, spaceId }) => {
        await esClient.indices.delete(
          { index: getPrivilegedMonitorUsersIndex(spaceId) },
          { ignore: [404] }
        );
      });

      evaluate('lists privileged users (skills)', async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-skills: privileged users',
            description: 'Privileged user monitoring questions validated via Agent Builder skills',
            agentId: AGENT_ID,
            examples: [
              {
                input: { question: 'Show me all privileged users in the system' },
                output: {
                  criteria: [
                    'Mentions at least one user',
                    'Indicates the user is privileged or has elevated access',
                  ],
                  toolCalls: [
                    {
                      id: 'invoke_skill',
                      criteria: [
                        'The agent should invoke the skill tool "entity_analytics_list_privileged_users".',
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
