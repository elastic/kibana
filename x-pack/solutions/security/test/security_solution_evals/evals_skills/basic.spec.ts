/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate } from '../src/evaluate';
import { cleanStandardListExceptAction } from '../src/helpers/saved_objects_cleanup';
import { oneChatDefaultAgentId } from '@kbn/onechat-common';

const AGENT_ID = oneChatDefaultAgentId;

evaluate.describe('Security Entity Analytics (Skills) - Basic', { tag: '@svlSecurity' }, () => {
    evaluate.beforeAll(async ({ supertest, log, kbnClient }) => {
        await cleanStandardListExceptAction(kbnClient);
    });

    evaluate.afterAll(async ({ supertest, log, kbnClient }) => {
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
                                'Mentions Elastic Security',
                                'Mentions entity analytics',
                                'Stays concise and on-topic',
                            ],
                        },
                        metadata: { query_intent: 'Factual' },
                    },
                    {
                        input: { question: 'What is the weather today?' },
                        output: {
                            criteria: [
                                'Politely declines to answer',
                                'Mentions the question is unrelated to security or Elastic Security',
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
