/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { StaticToolRegistration, BuiltinToolDefinition } from '@kbn/onechat-server';
import type {
    ObservabilityAgentBuilderPluginStart,
    ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';

export const OBSERVABILITY_GET_SLOS_TOOL_ID = 'observability.get_slos';

const schema = z.object({
    operation: z
        .enum(['list', 'get'])
        .describe('Operation to perform: list SLOs (summary) or get one SLO by id'),
    sloId: z
        .string()
        .optional()
        .describe('SLO id (required for operation="get")'),
    size: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Max results to return (default: 50). For get: max instances returned.'),
});

/**
 * Read-only SLO tool based on SLO summary documents.
 *
 * Note: This tool intentionally avoids any create/update/delete operations.
 */
export function createGetSlosTool({
    core,
    logger,
}: {
    core: CoreSetup<ObservabilityAgentBuilderPluginStartDependencies, ObservabilityAgentBuilderPluginStart>;
    logger: Logger;
}): StaticToolRegistration<typeof schema> {
    const toolDefinition: BuiltinToolDefinition<typeof schema> = {
        id: OBSERVABILITY_GET_SLOS_TOOL_ID,
        type: ToolType.builtin,
        description:
            'List and inspect SLOs (read-only) using SLO summary documents. Supports listing SLO ids/names/status and fetching summary rows for a specific SLO.',
        schema,
        tags: ['observability', 'slo'],
        availability: {
            cacheMode: 'space',
            handler: async ({ request }) => getAgentBuilderResourceAvailability({ core, request, logger }),
        },
        handler: async ({ operation, sloId, size }, { request, esClient, spaceId }) => {
            const max = size ?? 50;
            const [, pluginsStart] = await core.getStartServices();

            const slo = pluginsStart.slo;
            if (!slo) {
                return {
                    results: [
                        {
                            type: ToolResultType.error,
                            data: { message: 'SLO plugin not available in this deployment.' },
                        },
                    ],
                };
            }

            const sloClient = slo.getSloClientWithRequest(request);
            const indices = await sloClient.getSummaryIndices();

            if (operation === 'list') {
                const resp = await esClient.asCurrentUser.search({
                    index: indices,
                    size: 0,
                    query: { bool: { filter: [{ term: { spaceId } }] } },
                    aggs: {
                        slos: {
                            terms: { field: 'slo.id', size: max, order: { _key: 'asc' } },
                            aggs: {
                                sample: {
                                    top_hits: {
                                        size: 1,
                                        sort: [{ summaryUpdatedAt: { order: 'desc' } }],
                                        _source: {
                                            includes: [
                                                'slo.id',
                                                'slo.name',
                                                'slo.description',
                                                'slo.tags',
                                                'slo.revision',
                                                'slo.timeWindow',
                                                'slo.objective',
                                                'status',
                                                'errorBudgetRemaining',
                                                'errorBudgetConsumed',
                                                'sliValue',
                                                'summaryUpdatedAt',
                                                'fiveMinuteBurnRate.value',
                                                'oneHourBurnRate.value',
                                                'oneDayBurnRate.value',
                                            ],
                                        },
                                    },
                                },
                            },
                        },
                    },
                });

                const buckets = (resp.aggregations as any)?.slos?.buckets ?? [];
                const items = buckets.map((b: any) => {
                    const hit = b.sample?.hits?.hits?.[0]?._source;
                    return {
                        sloId: b.key as string,
                        count: b.doc_count as number,
                        summary: hit ?? null,
                    };
                });

                return {
                    results: [
                        {
                            type: ToolResultType.other,
                            data: {
                                operation: 'list',
                                indices,
                                total: items.length,
                                items,
                            },
                        },
                    ],
                };
            }

            // operation === 'get'
            if (!sloId) {
                return {
                    results: [
                        {
                            type: ToolResultType.error,
                            data: { message: 'Missing required parameter: sloId (required for operation="get")' },
                        },
                    ],
                };
            }

            const resp = await esClient.asCurrentUser.search({
                index: indices,
                size: max,
                query: {
                    bool: {
                        filter: [{ term: { spaceId } }, { term: { 'slo.id': sloId } }],
                    },
                },
                sort: [{ summaryUpdatedAt: { order: 'desc' } }],
                _source: {
                    includes: [
                        'slo.id',
                        'slo.name',
                        'slo.description',
                        'slo.tags',
                        'slo.revision',
                        'slo.instanceId',
                        'slo.groupBy',
                        'slo.groupings',
                        'slo.timeWindow',
                        'slo.objective',
                        'status',
                        'errorBudgetRemaining',
                        'errorBudgetConsumed',
                        'errorBudgetInitial',
                        'errorBudgetEstimated',
                        'sliValue',
                        'summaryUpdatedAt',
                        'latestSliTimestamp',
                        'fiveMinuteBurnRate',
                        'oneHourBurnRate',
                        'oneDayBurnRate',
                    ],
                },
            });

            const rows = resp.hits.hits.map((h: any) => h._source).filter(Boolean);

            return {
                results: [
                    {
                        type: ToolResultType.other,
                        data: {
                            operation: 'get',
                            indices,
                            sloId,
                            count: rows.length,
                            items: rows,
                        },
                    },
                ],
            };
        },
    };

    return toolDefinition;
}



