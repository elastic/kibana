/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { evaluate } from '../src/evaluate';
import { cleanStandardListExceptAction } from '../src/helpers/saved_objects_cleanup';
import { seedPrivilegedAccessAnomalies, getMlAnomalyIndex } from '../src/helpers/ml_anomalies';

const AGENT_ID = agentBuilderDefaultAgentId;

evaluate.describe(
  'Security Entity Analytics (Skills) - Privileged Access Anomalies',
  { tag: '@svlSecurity' },
  () => {
    evaluate.beforeAll(async ({ kbnClient }) => {
      await cleanStandardListExceptAction(kbnClient);
    });

    evaluate.afterAll(async ({ kbnClient }) => {
      await cleanStandardListExceptAction(kbnClient);
    });

    evaluate.describe('without data', () => {
      evaluate('privileged access anomalies - without data', async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-skills: privileged access anomalies without data',
            description:
              'Privileged access anomaly questions validated via Agent Builder skills (ML jobs not enabled)',
            agentId: AGENT_ID,
            examples: [
              {
                input: { question: 'Show accounts performing unusual administrative actions' },
                output: {
                  criteria: [
                    'Responds about anomalies, ML jobs, privileged access, or indicates no data/results found',
                  ],
                  toolCalls: [{ id: 'invoke_skill' }],
                },
                metadata: { query_intent: 'Factual' },
              },
            ],
          },
        });
      });
    });

    evaluate.describe('with ML anomalies data', () => {
      evaluate.beforeAll(async ({ esClient, spaceId }) => {
        await seedPrivilegedAccessAnomalies(esClient, spaceId);
      });

      evaluate.afterAll(async ({ esClient, spaceId }) => {
        await esClient.indices.delete(
          { index: getMlAnomalyIndex('pad', spaceId) },
          { ignore: [404] }
        );
      });

      evaluate('privileged access anomalies - with data', async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-skills: privileged access anomalies',
            description:
              'Privileged access anomaly queries validated via Agent Builder skills (ML anomalies indices present)',
            agentId: AGENT_ID,
            examples: [
              {
                input: { question: 'Show accounts performing unusual administrative actions' },
                output: {
                  criteria: [
                    'Responds with information about anomalies, administrative actions, accounts, or ML detection results',
                  ],
                  toolCalls: [{ id: 'invoke_skill' }],
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
