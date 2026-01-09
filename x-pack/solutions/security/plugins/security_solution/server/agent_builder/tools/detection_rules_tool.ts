/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolType } from '@kbn/onechat-common';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { securityTool } from './constants';
import {
    EQL_RULE_TYPE_ID,
    ESQL_RULE_TYPE_ID,
    INDICATOR_RULE_TYPE_ID,
    ML_RULE_TYPE_ID,
    NEW_TERMS_RULE_TYPE_ID,
    QUERY_RULE_TYPE_ID,
    SAVED_QUERY_RULE_TYPE_ID,
    SIGNALS_ID,
    THRESHOLD_RULE_TYPE_ID,
} from '@kbn/securitysolution-rules';

const DETECTION_RULE_FILTER = [
    SIGNALS_ID,
    EQL_RULE_TYPE_ID,
    ESQL_RULE_TYPE_ID,
    ML_RULE_TYPE_ID,
    QUERY_RULE_TYPE_ID,
    SAVED_QUERY_RULE_TYPE_ID,
    THRESHOLD_RULE_TYPE_ID,
    INDICATOR_RULE_TYPE_ID,
    NEW_TERMS_RULE_TYPE_ID,
]
    .map((id) => `alert.attributes.alertTypeId: ${id}`)
    .join(' OR ');

const schema = z.discriminatedUnion('operation', [
    z.object({
        operation: z.literal('find'),
        params: z.object({
            search: z.string().optional().describe('Optional free-text search'),
            perPage: z.number().int().min(1).max(200).optional().default(50),
            page: z.number().int().min(1).optional().default(1),
        }),
    }),
    z.object({
        operation: z.literal('get'),
        params: z.object({
            id: z.string().describe('Alerting rule id'),
        }),
    }),
    z.object({
        operation: z.literal('set_enabled'),
        params: z.object({
            id: z.string().describe('Alerting rule id'),
            enabled: z.boolean().describe('Whether the detection rule should be enabled'),
            confirm: z
                .literal(true)
                .describe('Required for enable/disable. Set to true only if the user explicitly confirmed.'),
        }),
    }),
]);

export const detectionRulesTool = (
    core: SecuritySolutionPluginCoreSetupDependencies
): BuiltinToolDefinition<typeof schema> => {
    return {
        id: securityTool('detection_rules'),
        type: ToolType.builtin,
        description: 'Find/get and enable/disable Security detection rules (no delete).',
        schema,
        handler: async (input, { request }) => {
            const [coreStart, pluginsStart] = await core.getStartServices();

            switch (input.operation) {
                case 'find': {
                    const so = coreStart.savedObjects.getScopedClient(request);
                    const res = await so.find({
                        type: 'alert',
                        search: input.params.search,
                        perPage: input.params.perPage,
                        page: input.params.page,
                        filter: DETECTION_RULE_FILTER,
                    });
                    return {
                        results: [
                            {
                                type: 'other',
                                data: {
                                    operation: 'find',
                                    items: res.saved_objects,
                                    total: res.total,
                                    perPage: res.per_page,
                                    page: res.page,
                                },
                            },
                        ],
                    };
                }
                case 'get': {
                    const rulesClient = await pluginsStart.alerting.getRulesClientWithRequest(request);
                    const res = await rulesClient.get({ id: input.params.id });
                    return { results: [{ type: 'other', data: { operation: 'get', item: res } }] };
                }
                case 'set_enabled': {
                    const rulesClient = await pluginsStart.alerting.getRulesClientWithRequest(request);
                    if (input.params.enabled) {
                        await rulesClient.enableRule({ id: input.params.id });
                    } else {
                        await rulesClient.disableRule({ id: input.params.id });
                    }
                    const res = await rulesClient.get({ id: input.params.id });
                    return { results: [{ type: 'other', data: { operation: 'set_enabled', item: res } }] };
                }
            }
        },
        tags: [],
    };
};


