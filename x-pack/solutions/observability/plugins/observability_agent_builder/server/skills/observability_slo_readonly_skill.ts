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

const OBSERVABILITY_SLO_READONLY_TOOL = tool(
    async (input, config) => {
        const onechat = getOneChatContext(config);
        if (!onechat) {
            throw new Error('OneChat context not available');
        }

        const asAny = input as any;
        const { operation, params, ...rest } = asAny ?? {};

        const toolId = operation === 'get_slos' ? 'observability.get_slos' : 'observability.get_alerts';

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
        name: 'observability.slo_readonly',
        description:
            'Single entrypoint for read-only SLO discovery/inspection and related alert context. Routes to get_slos or get_alerts.',
        schema: z.discriminatedUnion('operation', [
            z.object({
                operation: z.literal('get_slos').describe('List or get SLO summaries (read-only).'),
                params: z.object({}).passthrough().optional(),
            }).passthrough(),
            z.object({
                operation: z.literal('get_alerts').describe('Fetch related alert context (read-only).'),
                params: z.object({}).passthrough().optional(),
            }).passthrough(),
        ]),
    }
);

export const OBSERVABILITY_SLO_READONLY_SKILL: Skill = {
    namespace: 'observability.slo_readonly',
    name: 'Observability SLOs (Read-only)',
    description: 'Read-only guidance for SLO discovery and interpretation',
    content: `# Observability SLOs (Read-only)

## What this skill does
Helps you **list** and **inspect** SLO summaries (status, error budget, burn rates) and interpret what they mean.\n

## Tools
- Use \`observability.slo_readonly\` (single tool for this skill):\n
  - \`operation: "get_slos"\` routes to \`observability.get_slos\`\n
  - \`operation: "get_alerts"\` routes to \`observability.get_alerts\`\n
\n
## Optional pivots
- If you need related alert context (e.g. burn rate alerts firing), use \`observability.get_alerts\`.\n
`,
    tools: [OBSERVABILITY_SLO_READONLY_TOOL],
};


