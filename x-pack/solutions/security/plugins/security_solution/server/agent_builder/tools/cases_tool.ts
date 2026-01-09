/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { createErrorResult } from '@kbn/onechat-server';
import { ToolType } from '@kbn/onechat-common';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { securityTool } from './constants';

const SECURITY_SOLUTION_CASE_OWNER = 'securitySolution' as const;
const NONE_CONNECTOR = {
    id: 'none',
    name: 'none',
    type: '.none',
    fields: null,
} as const;

const DEFAULT_CASE_SETTINGS = {
    syncAlerts: true,
    extractObservables: true,
} as const;

const schema = z.discriminatedUnion('operation', [
    z.object({
        operation: z.literal('create_case'),
        params: z.object({
            title: z.string().describe('Case title'),
            description: z.string().describe('Case description'),
            tags: z.array(z.string()).optional().default([]),
            severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
            confirm: z
                .literal(true)
                .describe('Required for create. Set to true only if the user explicitly confirmed.'),
        }),
    }),
    z.object({
        operation: z.literal('update_case'),
        params: z.object({
            id: z.string().describe('Case id'),
            title: z.string().optional(),
            description: z.string().optional(),
            tags: z.array(z.string()).optional(),
            severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
            status: z.enum(['open', 'in-progress', 'closed']).optional(),
            confirm: z
                .literal(true)
                .describe('Required for update. Set to true only if the user explicitly confirmed.'),
        }),
    }),
    z.object({
        operation: z.literal('attach_alerts'),
        params: z.object({
            caseId: z.string().describe('Case id'),
            alerts: z
                .array(
                    z.object({
                        alertId: z.string().describe('Alert id'),
                        index: z
                            .string()
                            .describe('Alerts index that contains the alert (e.g. ".alerts-security.alerts-default")'),
                        ruleId: z.string().optional().describe('Optional rule id associated with the alert'),
                        ruleName: z.string().optional().describe('Optional rule name associated with the alert'),
                    })
                )
                .min(1)
                .max(200)
                .describe('Alerts to attach to the case (max 200 per call).'),
            confirm: z
                .literal(true)
                .describe(
                    'Required for attaching alerts. Set to true only if the user explicitly confirmed.'
                ),
        }),
    }),
    z.object({
        operation: z.literal('add_comment'),
        params: z.object({
            caseId: z.string().describe('Case id'),
            comment: z
                .union([
                    z.string().min(1).describe('Markdown comment (preferred)'),
                    z
                        .object({
                            comment: z.string().min(1).describe('Markdown comment text'),
                            type: z.string().optional().describe('Ignored (tool always creates user comments)'),
                            owner: z.string().optional().describe('Ignored (tool always uses securitySolution owner)'),
                        })
                        .passthrough()
                        .describe(
                            'Compatibility shape (common LLM/Cases API guess). Only `comment.comment` is used.'
                        ),
                ])
                .describe('Comment to add. Prefer a plain string.'),
            confirm: z
                .literal(true)
                .describe('Required for adding a comment. Set to true only if the user explicitly confirmed.'),
        }),
    }),
]);

export const casesTool = (
    core: SecuritySolutionPluginCoreSetupDependencies
): BuiltinToolDefinition => {
    return {
        id: securityTool('cases'),
        type: ToolType.builtin,
        description: 'Create/update cases and add comments (no delete).',
        // BuiltinToolDefinition currently types schema as ZodObject; we use a discriminated union at runtime.
        schema: schema as unknown as z.ZodObject<any>,
        handler: async (input: z.infer<typeof schema>, { request }) => {
            const [, pluginsStart] = await core.getStartServices();
            const cases = pluginsStart.cases;
            if (!cases) {
                return { results: [createErrorResult('cases plugin not available')] };
            }
            const casesClient = await cases.getCasesClientWithRequest(request);

            switch (input.operation) {
                case 'create_case': {
                    const res = await casesClient.cases.create({
                        title: input.params.title,
                        description: input.params.description,
                        tags: input.params.tags,
                        severity: input.params.severity,
                        owner: SECURITY_SOLUTION_CASE_OWNER,
                        connector: NONE_CONNECTOR,
                        settings: DEFAULT_CASE_SETTINGS,
                    } as any);
                    return { results: [{ type: 'other', data: { operation: 'create_case', item: res } }] };
                }
                case 'update_case': {
                    const existing = await casesClient.cases.get({ id: input.params.id });
                    const res = await casesClient.cases.bulkUpdate({
                        cases: [
                            {
                                id: input.params.id,
                                version: existing.version,
                                ...(input.params.title !== undefined ? { title: input.params.title } : {}),
                                ...(input.params.description !== undefined ? { description: input.params.description } : {}),
                                ...(input.params.tags !== undefined ? { tags: input.params.tags } : {}),
                                ...(input.params.severity !== undefined ? { severity: input.params.severity } : {}),
                                ...(input.params.status !== undefined ? { status: input.params.status } : {}),
                            },
                        ],
                    } as any);
                    return { results: [{ type: 'other', data: { operation: 'update_case', item: res } }] };
                }
                case 'attach_alerts': {
                    const first = input.params.alerts[0];
                    const res = await casesClient.attachments.add({
                        caseId: input.params.caseId,
                        comment: {
                            type: 'alert',
                            alertId: input.params.alerts.map((a) => a.alertId),
                            index: input.params.alerts.map((a) => a.index),
                            rule: {
                                id: first?.ruleId ?? null,
                                name: first?.ruleName ?? null,
                            },
                            owner: SECURITY_SOLUTION_CASE_OWNER,
                        },
                    } as any);
                    return { results: [{ type: 'other', data: { operation: 'attach_alerts', item: res } }] };
                }
                case 'add_comment': {
                    const comment =
                        typeof input.params.comment === 'string'
                            ? input.params.comment
                            : (input.params.comment as any)?.comment;
                    try {
                        const res = await casesClient.attachments.add({
                            caseId: input.params.caseId,
                            comment: {
                                comment,
                                type: 'user',
                                owner: SECURITY_SOLUTION_CASE_OWNER,
                            },
                        } as any);
                        return { results: [{ type: 'other', data: { operation: 'add_comment', item: res } }] };
                    } catch (e: any) {
                        return {
                            results: [
                                createErrorResult({
                                    message:
                                        `Failed while adding a comment to case id: ${input.params.caseId}. ` +
                                        `Expected params.comment to be a markdown string (or { comment: "<markdown>" }).`,
                                    metadata: {
                                        expected_params_example: {
                                            operation: 'add_comment',
                                            params: {
                                                caseId: input.params.caseId,
                                                comment: 'Example: Investigated alert; acknowledged as benign.',
                                                confirm: true,
                                            },
                                        },
                                    },
                                }),
                            ],
                        };
                    }
                }
            }
        },
        tags: [],
    };
};


