/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate } from '../src/evaluate';
import { cleanStandardListExceptAction } from '../src/helpers/saved_objects_cleanup';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';

const AGENT_ID = agentBuilderDefaultAgentId;

evaluate.describe('Security Entity Analytics (Skills) - Basic', { tag: '@svlSecurity' }, () => {
  evaluate.beforeAll(async ({ kbnClient }) => {
    await cleanStandardListExceptAction(kbnClient);
  });

  evaluate.afterAll(async ({ kbnClient }) => {
    await cleanStandardListExceptAction(kbnClient);
  });

  evaluate('role + off-topic handling', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'entity-analytics-skills: basic',
        description: 'Basic questions to validate skills-based Entity Analytics behavior',
        agentId: AGENT_ID,
        examples: [
          {
            input: { question: 'What is your role?' },
            output: {
              criteria: [
                'Mentions security or Elastic',
                'Stays on-topic and professional',
              ],
            },
            metadata: { query_intent: 'Factual' },
          },
          {
            input: { question: 'What is the weather today?' },
            output: {
              criteria: [
                'Politely declines or redirects the question',
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
