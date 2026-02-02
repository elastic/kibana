/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/agent-builder-common/skills';
import { z } from '@kbn/zod';
import { tool } from '@langchain/core/tools';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';

const getOneChatContext = (config: unknown): Omit<ToolHandlerContext, 'resultStore'> | null => {
    if (!config || typeof config !== 'object') {
        return null;
    }

    const maybeConfig = config as {
        configurable?: { onechat?: Omit<ToolHandlerContext, 'resultStore'> };
    };

    return maybeConfig.configurable?.onechat ?? null;
};

const OBSERVABILITY_LOGS_TOOL = tool(
    async (input, config) => {
        const onechat = getOneChatContext(config);
        if (!onechat) {
            throw new Error('OneChat context not available');
        }

        const asAny = input as any;
        const { operation, params, ...rest } = asAny ?? {};

        const toolId = (() => {
            switch (operation) {
                case 'get_data_sources':
                    return 'observability.get_data_sources';
                case 'run_log_rate_analysis':
                    return 'observability.run_log_rate_analysis';
                case 'get_log_categories':
                    return 'observability.get_log_categories';
                case 'get_correlated_logs':
                    return 'observability.get_correlated_logs';
                default:
                    return 'observability.get_data_sources';
            }
        })();

        const available = await onechat.toolProvider.has({ toolId, request: onechat.request });
        if (!available) {
            return JSON.stringify({
                error: {
                    message: `Tool "${toolId}" not found. It may be disabled, not registered, or unavailable in this deployment.`,
                },
                toolId,
            });
        }

        const result = await onechat.runner.runTool({
            toolId,
            toolParams: ((params ?? rest) ?? {}) as Record<string, unknown>,
        });

        return JSON.stringify(result);
    },
    {
        name: 'observability.logs',
        description:
            'Single entrypoint for logs exploration. Routes to data source discovery, log rate analysis, log categories, or correlated logs.',
        schema: z.discriminatedUnion('operation', [
            z.object({
                operation: z.literal('get_data_sources').describe('Discover available log data sources (read-only).'),
                params: z.object({}).passthrough().optional(),
            }).passthrough(),
            z.object({
                operation: z.literal('run_log_rate_analysis').describe('Run log rate analysis for a time range (read-only).'),
                params: z.object({}).passthrough().optional(),
            }).passthrough(),
            z.object({
                operation: z.literal('get_log_categories').describe('Get log categories/patterns for a time range (read-only).'),
                params: z.object({}).passthrough().optional(),
            }).passthrough(),
            z.object({
                operation: z.literal('get_correlated_logs').describe('Find logs correlated to an anchor log/time range (read-only).'),
                params: z.object({}).passthrough().optional(),
            }).passthrough(),
        ]),
    }
);

export const OBSERVABILITY_LOGS_SKILL: Skill = {
    namespace: 'observability.logs',
    name: 'Observability Logs',
    description: 'Explore logs, categories/patterns, and correlations',
    content: `# Observability Logs

## WHEN TO USE THIS TOOL (REQUIRED)

You MUST use this tool when the user asks about:
- Log data sources or log indices
- Log patterns or categories
- Log rate analysis or spikes
- Correlated logs

**ALWAYS call the tool - do NOT answer from memory.**

## RESPONSE FORMAT (MANDATORY)

Your response MUST contain ONLY information from the tool results.

### When listing data sources:
- If sources found: "Found X log data sources:" then list names
- If none: "No log data sources found."

### When analyzing logs:
Show analysis results from tool: patterns, categories, rates.

## FORBIDDEN RESPONSES
- Do NOT explain what logs are
- Do NOT add information not in tool results

## Operations
- \`get_data_sources\`: Discover available log sources
- \`run_log_rate_analysis\`: Analyze log rates
- \`get_log_categories\`: Find log patterns
- \`get_correlated_logs\`: Find related logs
`,
    tools: [OBSERVABILITY_LOGS_TOOL],
};
