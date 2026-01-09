/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';
import { z } from '@kbn/zod';
import { tool } from '@langchain/core/tools';
import type { ToolHandlerContext } from '@kbn/onechat-server/tools';

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

## What this skill does
Helps you explore logs, find patterns/categories, do rate analysis, and correlate with services/alerts.

## When to use
- You need examples of errors/warnings for a time window.\n
- You need to understand what changed (log rate spike / new patterns).\n

## Inputs to ask the user for
- Time range\n
- Service/host/environment filters\n
- “What does ‘interesting’ mean?” (errors, specific message, etc.)\n
`,
    tools: [OBSERVABILITY_LOGS_TOOL],
};


