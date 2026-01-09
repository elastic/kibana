/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneChatDefaultAgentId } from '@kbn/onechat-common';
import { evaluate } from '../src/evaluate';
import { cleanStandardListExceptAction } from '../src/helpers/saved_objects_cleanup';

const AGENT_ID = oneChatDefaultAgentId;

const ENTITY_STORE_EVAL_INDEX = '.entities.skills_evals_default';

evaluate.describe(
    'Security Entity Analytics (Skills) - Entity Store',
    { tag: '@svlSecurity' },
    () => {
        evaluate.beforeAll(async ({ kbnClient, esClient }) => {
            await cleanStandardListExceptAction(kbnClient);

            // Create a small entity store-like index that matches `.entities.*`
            await esClient.indices.create(
                {
                    index: ENTITY_STORE_EVAL_INDEX,
                    mappings: {
                        dynamic: true,
                        properties: {
                            '@timestamp': { type: 'date' },
                            entity: {
                                properties: {
                                    id: { type: 'keyword' },
                                    name: { type: 'keyword' },
                                    type: { type: 'keyword' },
                                    source: { type: 'keyword' },
                                },
                            },
                        },
                    },
                },
                { ignore: [400] }
            );

            await esClient.index({
                index: ENTITY_STORE_EVAL_INDEX,
                document: {
                    '@timestamp': new Date().toISOString(),
                    entity: {
                        id: 'user:john',
                        name: 'john',
                        type: 'user',
                        source: 'skills_evals',
                    },
                },
                refresh: 'wait_for',
            });
        });

        evaluate.afterAll(async ({ kbnClient, esClient }) => {
            await esClient.indices.delete({ index: ENTITY_STORE_EVAL_INDEX }, { ignore: [404] });
            await cleanStandardListExceptAction(kbnClient);
        });

        evaluate('finds an entity by name (skills)', async ({ evaluateDataset }) => {
            await evaluateDataset({
                dataset: {
                    name: 'entity-analytics-skills: entity store',
                    description: 'Entity Store queries validated via OneAgent skills',
                    agentId: AGENT_ID,
                    examples: [
                        {
                            input: { question: 'Show me information about user john from the entity store.' },
                            output: {
                                criteria: ['Mentions john', 'Mentions entity store or entity profile'],
                                toolCalls: [
                                    {
                                        id: 'invoke_skill',
                                        criteria: [
                                            'The agent should invoke the skill tool "entity_analytics_search_entity_store".',
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
