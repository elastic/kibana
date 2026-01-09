/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assetCriticalityRouteHelpersFactory } from '@kbn/test-suites-security-solution-apis/test_suites/entity_analytics/utils/asset_criticality';
import { evaluate } from '../src/evaluate';
import { cleanStandardListExceptAction } from '../src/helpers/saved_objects_cleanup';
import { oneChatDefaultAgentId } from '@kbn/onechat-common';

const AGENT_ID = oneChatDefaultAgentId;

evaluate.describe(
    'Security Entity Analytics (Skills) - Asset Criticality',
    { tag: '@svlSecurity' },
    () => {
        evaluate.beforeAll(async ({ kbnClient }) => {
            await cleanStandardListExceptAction(kbnClient);
        });

        evaluate.afterAll(async ({ kbnClient }) => {
            await cleanStandardListExceptAction(kbnClient);
        });

        evaluate.describe('with asset criticality data', () => {
            evaluate.beforeAll(async ({ supertest }) => {
                const assetCriticalityRoutes = assetCriticalityRouteHelpersFactory(supertest);
                await assetCriticalityRoutes.upsert({
                    id_field: 'host.name',
                    id_value: 'host-1',
                    // Criticality API uses impact levels, not "critical".
                    criticality_level: 'extreme_impact',
                });
            });

            evaluate('lists critical assets (skills)', async ({ evaluateDataset }) => {
                await evaluateDataset({
                    dataset: {
                        name: 'entity-analytics-skills: asset criticality',
                        description: 'Asset criticality questions validated via OneAgent skills',
                        agentId: AGENT_ID,
                        examples: [
                            {
                                input: { question: 'Which assets are marked as extreme impact?' },
                                output: {
                                    criteria: [
                                        'Returns at least one asset',
                                        'Includes host-1 or mentions host.name host-1',
                                        'Mentions criticality level extreme_impact (or equivalent wording: extreme impact)',
                                    ],
                                    toolCalls: [
                                        {
                                            id: 'invoke_skill',
                                            criteria: [
                                                'The agent should invoke the skill tool "entity_analytics_get_asset_criticality".',
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
