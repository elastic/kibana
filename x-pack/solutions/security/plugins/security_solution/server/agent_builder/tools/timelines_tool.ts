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
import { timelineSavedObjectType } from '../../lib/timeline/saved_object_mappings/timelines';

const schema = z.discriminatedUnion('operation', [
    z.object({
        operation: z.literal('find'),
        params: z.object({
            search: z.string().optional().describe('Optional search string'),
            perPage: z.number().int().min(1).max(200).optional().default(20),
            page: z.number().int().min(1).optional().default(1),
        }),
    }),
    z.object({
        operation: z.literal('get'),
        params: z.object({
            id: z.string().describe('Timeline saved object id'),
        }),
    }),
    z.object({
        operation: z.literal('create'),
        params: z.object({
            title: z.string().describe('Human-friendly title for the timeline'),
            description: z.string().optional().describe('Optional description'),
            attributes: z
                .record(z.unknown())
                .optional()
                .describe('Optional advanced saved object attributes (escape hatch).'),
            references: z
                .array(z.object({ type: z.string(), id: z.string(), name: z.string() }))
                .optional()
                .default([]),
            confirm: z
                .literal(true)
                .describe('Required for create. Set to true only if the user explicitly confirmed.'),
        }),
    }),
    z.object({
        operation: z.literal('update'),
        params: z.object({
            id: z.string().describe('Timeline saved object id'),
            title: z.string().optional(),
            description: z.string().optional(),
            attributes: z
                .record(z.unknown())
                .optional()
                .describe('Optional advanced attributes patch (escape hatch).'),
            confirm: z
                .literal(true)
                .describe('Required for update. Set to true only if the user explicitly confirmed.'),
        }),
    }),
]);

export const timelinesTool = (
    core: SecuritySolutionPluginCoreSetupDependencies
): BuiltinToolDefinition<typeof schema> => {
    return {
        id: securityTool('timelines'),
        type: ToolType.builtin,
        description: 'Find/get/create/update timelines via saved objects (no delete).',
        schema,
        handler: async (input, { request }) => {
            const [coreStart] = await core.getStartServices();
            const so = coreStart.savedObjects.getScopedClient(request);

            switch (input.operation) {
                case 'find': {
                    const res = await so.find({
                        type: timelineSavedObjectType,
                        search: input.params.search,
                        perPage: input.params.perPage,
                        page: input.params.page,
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
                    const res = await so.get(timelineSavedObjectType, input.params.id);
                    return { results: [{ type: 'other', data: { operation: 'get', item: res } }] };
                }
                case 'create': {
                    const attributes = {
                        ...(input.params.attributes ?? {}),
                        title: input.params.title,
                        ...(input.params.description !== undefined ? { description: input.params.description } : {}),
                    };
                    const res = await so.create(timelineSavedObjectType, attributes, {
                        references: input.params.references,
                    });
                    return { results: [{ type: 'other', data: { operation: 'create', item: res } }] };
                }
                case 'update': {
                    const current = await so.get(timelineSavedObjectType, input.params.id);
                    const attributes = {
                        ...(input.params.attributes ?? {}),
                        ...(input.params.title !== undefined ? { title: input.params.title } : {}),
                        ...(input.params.description !== undefined ? { description: input.params.description } : {}),
                    };
                    const res = await so.update(
                        timelineSavedObjectType,
                        input.params.id,
                        attributes,
                        { version: current.version }
                    );
                    return { results: [{ type: 'other', data: { operation: 'update', item: res } }] };
                }
            }
        },
        tags: [],
    };
};


