/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolType } from '@kbn/onechat-common';
import { createErrorResult } from '@kbn/onechat-server';
import type { ListPluginSetup } from '@kbn/lists-plugin/server';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { securityTool } from './constants';
import { v4 as uuidv4 } from 'uuid';
import { ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';

const listOperatorSchema = z.enum(['included', 'excluded']);

const entryMatchSchema = z.object({
    type: z.literal('match'),
    field: z.string().min(1).describe('Field name'),
    operator: listOperatorSchema,
    value: z.string().min(1).describe('Match value'),
});

const entryMatchAnySchema = z.object({
    type: z.literal('match_any'),
    field: z.string().min(1).describe('Field name'),
    operator: listOperatorSchema,
    value: z.array(z.string().min(1)).min(1).describe('One or more values'),
});

const entryExistsSchema = z.object({
    type: z.literal('exists'),
    field: z.string().min(1).describe('Field name'),
    operator: listOperatorSchema,
});

const entryWildcardSchema = z.object({
    type: z.literal('wildcard'),
    field: z.string().min(1).describe('Field name'),
    operator: listOperatorSchema,
    value: z.string().min(1).describe('Wildcard pattern, e.g. C:\\\\Windows\\\\*'),
});

const entryListSchema = z.object({
    type: z.literal('list'),
    field: z.string().min(1).describe('Field name'),
    operator: listOperatorSchema,
    list: z.object({
        id: z.string().min(1).describe('Value list id'),
        type: z.string().min(1).describe('Value list type (e.g. keyword, ip, text)'),
    }),
});

const entrySchema: z.ZodType<any> = z.lazy(() =>
    z.union([
        entryMatchSchema,
        entryMatchAnySchema,
        entryExistsSchema,
        entryWildcardSchema,
        entryListSchema,
        z.object({
            type: z.literal('nested'),
            field: z.string().min(1).describe('Nested field name'),
            entries: z.array(entrySchema).min(1).describe('Nested entries'),
        }),
    ])
);

const exceptionItemStructuredSchema = z.object({
    name: z.string().min(1).describe('Name of the exception item'),
    description: z.string().min(1).describe('Description of the exception item'),
    entries: z.array(entrySchema).min(1).describe('One or more exception entries'),
    tags: z.array(z.string()).optional().default([]),
    os_types: z.array(z.enum(['windows', 'linux', 'macos'])).optional(),
    expire_time: z.string().optional().describe('Optional expiration time (ISO string)'),
    meta: z.record(z.unknown()).optional().describe('Optional metadata (escape hatch)'),
});

const ensureValidEntries = (entries: Array<any>) => {
    const hasList = entries.some((e) => e.type === 'list');
    const hasNonList = entries.some((e) => e.type !== 'list');
    if (hasList && hasNonList) {
        throw new Error('Cannot mix entries of type "list" with other entry types.');
    }
};

const schema = z.discriminatedUnion('operation', [
    z.object({
        operation: z.literal('find'),
        params: z.object({
            listId: z.string().describe('Exception list id (list_id)'),
            namespaceType: z.enum(['single', 'agnostic']).optional(),
            page: z.number().int().min(1).optional().default(1),
            perPage: z.number().int().min(1).max(200).optional().default(50),
            filter: z.string().optional().describe('Optional KQL filter'),
        }),
    }),
    z.object({
        operation: z.literal('get'),
        params: z.object({
            itemId: z.string().describe('Exception item id (item_id)'),
            namespaceType: z.enum(['single', 'agnostic']).optional(),
        }),
    }),
    z.object({
        operation: z.literal('create'),
        params: z.object({
            listId: z.string().describe('Exception list id (list_id)'),
            namespaceType: z.enum(['single', 'agnostic']).optional(),
            item: exceptionItemStructuredSchema.optional().describe('Structured exception item payload'),
            rawItem: z
                .record(z.unknown())
                .optional()
                .describe('Advanced escape hatch payload (merged onto structured fields if both provided).'),
            confirm: z
                .literal(true)
                .describe('Required for create. Set to true only if the user explicitly confirmed.'),
        }),
    }),
    z.object({
        operation: z.literal('update'),
        params: z.object({
            id: z.string().describe('Exception list item saved object id'),
            namespaceType: z.enum(['single', 'agnostic']).optional(),
            item: exceptionItemStructuredSchema
                .partial()
                .optional()
                .describe('Structured exception item update payload (partial)'),
            rawItem: z
                .record(z.unknown())
                .optional()
                .describe('Advanced escape hatch payload (merged onto structured fields if both provided).'),
            confirm: z
                .literal(true)
                .describe('Required for update. Set to true only if the user explicitly confirmed.'),
        }),
    }),
]);

export const exceptionListsTool = ({
    core,
    lists,
}: {
    core: SecuritySolutionPluginCoreSetupDependencies;
    lists?: ListPluginSetup;
}): BuiltinToolDefinition<typeof schema> => {
    return {
        id: securityTool('exception_lists'),
        type: ToolType.builtin,
        description: 'Find/get/create/update exception list items (no delete).',
        schema,
        handler: async (input, { request }) => {
            if (!lists) {
                return { results: [{ type: 'error', data: { message: 'lists plugin not available' } }] };
            }

            const [coreStart] = await core.getStartServices();
            const soClient = coreStart.savedObjects.getScopedClient(request);
            const username = 'elastic';
            const exceptionsClient = lists.getExceptionListClient(soClient as any, username);

            switch (input.operation) {
                case 'find': {
                    const namespaceType =
                        input.params.namespaceType ?? (input.params.listId === ENDPOINT_LIST_ID ? 'agnostic' : 'single');
                    const res = await exceptionsClient.findExceptionListItem({
                        listId: input.params.listId,
                        namespaceType,
                        page: input.params.page,
                        perPage: input.params.perPage,
                        filter: input.params.filter,
                    } as any);
                    return {
                        results: [
                            {
                                type: 'other',
                                data: {
                                    operation: 'find',
                                    items: res.data,
                                    total: res.total,
                                    page: res.page,
                                    perPage: res.per_page ?? res.perPage,
                                },
                            },
                        ],
                    };
                }
                case 'get': {
                    const namespaceType = input.params.namespaceType ?? 'single';
                    const res = await exceptionsClient.getExceptionListItem({
                        itemId: input.params.itemId,
                        namespaceType,
                    } as any);
                    return { results: [{ type: 'other', data: { operation: 'get', item: res } }] };
                }
                case 'create': {
                    const merged = {
                        ...(input.params.rawItem ?? {}),
                        ...(input.params.item ?? {}),
                    } as any;
                    const validation = exceptionItemStructuredSchema.safeParse(merged);
                    if (!validation.success) {
                        const issues = validation.error.issues.slice(0, 6).map((i) => ({
                            path: i.path.join('.'),
                            message: i.message,
                        }));
                        const missing: string[] = [];
                        if (!merged.name) missing.push('item.name');
                        if (!merged.description) missing.push('item.description');
                        if (!merged.entries) missing.push('item.entries');
                        return {
                            results: [
                                createErrorResult({
                                    message:
                                        `Invalid exception list item payload for operation "create". ` +
                                        (missing.length ? `Missing required fields: ${missing.join(', ')}.` : `See validation issues.`),
                                    metadata: {
                                        operation: 'create',
                                        validation_issues: issues,
                                        expected_params_example: {
                                            operation: 'create',
                                            params: {
                                                listId: input.params.listId,
                                                namespaceType: input.params.namespaceType ?? 'single',
                                                item: {
                                                    name: merged.name ?? 'Example exception item name',
                                                    description:
                                                        merged.description ??
                                                        'Example: suppress known benign activity for this host/process.',
                                                    entries: merged.entries ?? [
                                                        {
                                                            type: 'match',
                                                            field: 'host.name',
                                                            operator: 'included',
                                                            value: 'my-host',
                                                        },
                                                    ],
                                                    tags: merged.tags ?? [],
                                                },
                                                confirm: true,
                                            },
                                        },
                                    },
                                }),
                            ],
                        };
                    }

                    ensureValidEntries(validation.data.entries);

                    try {
                        const itemId: string = merged.item_id ?? uuidv4();
                        const namespaceType =
                            input.params.namespaceType ?? (input.params.listId === ENDPOINT_LIST_ID ? 'agnostic' : 'single');

                        const osTypes = (validation.data.os_types ?? []) as any;
                        const expireTime = (validation.data.expire_time as any) ?? undefined;
                        const meta = (validation.data.meta as any) ?? undefined;
                        const tags = (validation.data.tags ?? []) as any;

                        // Special case: endpoint exceptions list lives in the agnostic namespace and uses a dedicated API.
                        // Users often refer to it by listId "endpoint_list".
                        const res =
                            input.params.listId === ENDPOINT_LIST_ID
                                ? await exceptionsClient.createEndpointListItem({
                                    comments: [],
                                    description: validation.data.description as any,
                                    entries: validation.data.entries as any,
                                    itemId: itemId as any,
                                    meta,
                                    name: validation.data.name as any,
                                    osTypes,
                                    tags,
                                    type: 'simple' as any,
                                })
                                : await exceptionsClient.createExceptionListItem({
                                    comments: [],
                                    description: validation.data.description as any,
                                    entries: validation.data.entries as any,
                                    expireTime,
                                    itemId: itemId as any,
                                    listId: input.params.listId as any,
                                    meta,
                                    name: validation.data.name as any,
                                    namespaceType: namespaceType as any,
                                    osTypes,
                                    tags,
                                    type: 'simple' as any,
                                });
                        return { results: [{ type: 'other', data: { operation: 'create', item: res } }] };
                    } catch (e: any) {
                        const reason =
                            typeof e?.getReason === 'function'
                                ? e.getReason()
                                : Array.isArray(e?.reason)
                                    ? e.reason
                                    : undefined;
                        return {
                            results: [
                                createErrorResult({
                                    message:
                                        `Failed to create exception list item (operation "create"). ` +
                                        `Ensure required fields are present (name, description, entries) and entries are valid. ` +
                                        `Underlying error: ${e?.message ?? String(e)}` +
                                        (Array.isArray(reason) && reason.length
                                            ? `. Validation reasons: ${reason.slice(0, 5).join(' | ')}`
                                            : ''),
                                    metadata: {
                                        operation: 'create',
                                        listId: input.params.listId,
                                        namespaceType:
                                            input.params.namespaceType ??
                                            (input.params.listId === ENDPOINT_LIST_ID ? 'agnostic' : 'single'),
                                        ...(Array.isArray(reason) ? { validation_reasons: reason } : {}),
                                        expected_params_example: {
                                            operation: 'create',
                                            params: {
                                                listId: input.params.listId,
                                                namespaceType:
                                                    input.params.namespaceType ??
                                                    (input.params.listId === ENDPOINT_LIST_ID ? 'agnostic' : 'single'),
                                                item: validation.data,
                                                confirm: true,
                                            },
                                        },
                                    },
                                }),
                            ],
                        };
                    }
                }
                case 'update': {
                    const merged = {
                        ...(input.params.rawItem ?? {}),
                        ...(input.params.item ?? {}),
                    } as any;
                    if (merged.entries) {
                        const entriesValidation = z.array(entrySchema).min(1).safeParse(merged.entries);
                        if (!entriesValidation.success) {
                            const issues = entriesValidation.error.issues.slice(0, 6).map((i) => ({
                                path: i.path.join('.'),
                                message: i.message,
                            }));
                            return {
                                results: [
                                    createErrorResult({
                                        message:
                                            `Invalid exception list item payload for operation "update". ` +
                                            `entries must be a non-empty array of valid entry objects.`,
                                        metadata: {
                                            operation: 'update',
                                            validation_issues: issues,
                                            expected_params_example: {
                                                operation: 'update',
                                                params: {
                                                    id: input.params.id,
                                                    namespaceType: input.params.namespaceType ?? 'single',
                                                    item: {
                                                        description: 'Example updated description',
                                                    },
                                                    confirm: true,
                                                },
                                            },
                                        },
                                    }),
                                ],
                            };
                        }
                        ensureValidEntries(entriesValidation.data);
                    }

                    try {
                        const namespaceType = input.params.namespaceType ?? 'single';
                        const existing = await exceptionsClient.getExceptionListItem({
                            id: input.params.id as any,
                            itemId: undefined,
                            namespaceType: namespaceType as any,
                        });

                        const next = {
                            ...existing,
                            ...merged,
                        } as any;

                        const isEndpoint = existing?.list_id === ENDPOINT_LIST_ID;

                        const updateParams: any = {
                            _version: existing?._version,
                            comments: existing?.comments ?? [],
                            entries: next.entries ?? existing?.entries,
                            expireTime: next.expire_time ?? existing?.expire_time,
                            id: input.params.id,
                            itemId: undefined,
                            namespaceType: isEndpoint ? 'agnostic' : namespaceType,
                            name: next.name ?? existing?.name,
                            description: next.description ?? existing?.description,
                            meta: next.meta ?? existing?.meta,
                            osTypes: next.os_types ?? existing?.os_types ?? [],
                            tags: next.tags ?? existing?.tags,
                            type: next.type ?? existing?.type ?? 'simple',
                        };

                        const res = isEndpoint
                            ? await exceptionsClient.updateEndpointListItem(updateParams)
                            : await exceptionsClient.updateExceptionListItem(updateParams);
                        return { results: [{ type: 'other', data: { operation: 'update', item: res } }] };
                    } catch (e: any) {
                        const reason =
                            typeof e?.getReason === 'function'
                                ? e.getReason()
                                : Array.isArray(e?.reason)
                                    ? e.reason
                                    : undefined;
                        return {
                            results: [
                                createErrorResult({
                                    message:
                                        `Failed to update exception list item (operation "update"). ` +
                                        `Underlying error: ${e?.message ?? String(e)}` +
                                        (Array.isArray(reason) && reason.length
                                            ? `. Validation reasons: ${reason.slice(0, 5).join(' | ')}`
                                            : ''),
                                    metadata: {
                                        operation: 'update',
                                        id: input.params.id,
                                        namespaceType: input.params.namespaceType,
                                        ...(Array.isArray(reason) ? { validation_reasons: reason } : {}),
                                        expected_params_example: {
                                            operation: 'update',
                                            params: {
                                                id: input.params.id,
                                                namespaceType: input.params.namespaceType ?? 'single',
                                                item: merged,
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


