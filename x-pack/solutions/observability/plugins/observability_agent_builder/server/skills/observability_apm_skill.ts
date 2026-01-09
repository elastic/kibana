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

const OBSERVABILITY_APM_TOOL = tool(
    async (input, config) => {
        const onechat = getOneChatContext(config);
        if (!onechat) {
            throw new Error('OneChat context not available');
        }

        const asAny = input as any;
        const { operation, params, ...rest } = asAny ?? {};

        const toolId =
            operation === 'get_services'
                ? 'observability.get_services'
                : 'observability.get_downstream_dependencies';

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
        name: 'observability.apm',
        description: 'Single entrypoint for APM exploration. Routes to service inventory or downstream dependencies.',
        schema: z.discriminatedUnion('operation', [
            z.object({
                operation: z.literal('get_services').describe('List/inspect APM services (read-only).'),
                params: z.object({}).passthrough().optional(),
            }).passthrough(),
            z.object({
                operation: z
                    .literal('get_downstream_dependencies')
                    .describe('Get downstream dependencies for a service (read-only).'),
                params: z.object({}).passthrough().optional(),
            }).passthrough(),
        ]),
    }
);

export const OBSERVABILITY_APM_SKILL: Skill = {
    namespace: 'observability.apm',
    name: 'Observability APM',
    description: 'Investigate services, traces, errors and performance regressions',
    content: `# Observability APM

## What this skill does
Helps you investigate APM signals: services, traces, transactions, latency, errors, and dependencies.

## When to use
- A service is slow or erroring and you need root-cause hypotheses.\n
- You need a dependency map and downstream impact.\n

## Inputs to ask the user for
- Service name (or ask to list services)\n
- Time range and environment\n

## Safe workflow
1) Identify service + time range.\n
2) Summarize golden signals (latency, throughput, error rate).\n
3) Pivot into traces/errors and downstream deps.\n
`,
    tools: [OBSERVABILITY_APM_TOOL],
};


