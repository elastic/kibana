/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { ToolType } from '@kbn/agent-builder-common';
import { createErrorResult } from '@kbn/agent-builder-server';
import type {
  ListPluginSetup,
  CreateExceptionListItemOptions,
  UpdateExceptionListItemOptions,
} from '@kbn/lists-plugin/server';
import { v4 as uuidv4 } from 'uuid';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { securityTool } from './constants';

interface BaseEntry {
  type: 'match' | 'match_any' | 'exists' | 'wildcard' | 'list';
  field: string;
  operator?: 'included' | 'excluded';
  value?: string | string[];
  list?: { id: string; type: string };
}

interface NestedEntry {
  type: 'nested';
  field: string;
  entries: ExceptionEntry[];
}

type ExceptionEntry = BaseEntry | NestedEntry;

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

const entrySchema: z.ZodType<ExceptionEntry> = z.lazy(() =>
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

const ensureValidEntries = (entries: ExceptionEntry[]) => {
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
        .describe(
          'Advanced escape hatch payload (merged onto structured fields if both provided).'
        ),
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
        .describe(
          'Advanced escape hatch payload (merged onto structured fields if both provided).'
        ),
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
      const exceptionsClient = lists.getExceptionListClient(soClient, username);

      switch (input.operation) {
        case 'find': {
          const namespaceType =
            input.params.namespaceType ??
            (input.params.listId === ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
              ? 'agnostic'
              : 'single');
          const res = await exceptionsClient.findExceptionListItem({
            listId: input.params.listId,
            namespaceType,
            page: input.params.page,
            perPage: input.params.perPage,
            filter: input.params.filter,
            sortField: undefined,
            sortOrder: undefined,
          });
          if (!res) {
            return {
              results: [
                createErrorResult({
                  message: `Exception list not found for listId "${input.params.listId}".`,
                }),
              ],
            };
          }
          return {
            results: [
              {
                type: 'other',
                data: {
                  operation: 'find',
                  items: res.data,
                  total: res.total,
                  page: res.page,
                  perPage: res.per_page,
                },
              },
            ],
          };
        }
        case 'get': {
          const namespaceType = input.params.namespaceType ?? 'single';
          const res = await exceptionsClient.getExceptionListItem({
            itemId: input.params.itemId,
            id: undefined,
            namespaceType,
          });
          return { results: [{ type: 'other', data: { operation: 'get', item: res } }] };
        }
        case 'create': {
          const merged: Record<string, unknown> = {
            ...(input.params.rawItem ?? {}),
            ...(input.params.item ?? {}),
          };
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
                  message: `Invalid exception list item payload for operation "create". ${
                    missing.length
                      ? `Missing required fields: ${missing.join(', ')}.`
                      : `See validation issues.`
                  }`,
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
            const itemId: string = typeof merged.item_id === 'string' ? merged.item_id : uuidv4();
            const namespaceType =
              input.params.namespaceType ??
              (input.params.listId === ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
                ? 'agnostic'
                : 'single');

            const osTypes = (validation.data.os_types ??
              []) as CreateExceptionListItemOptions['osTypes'];
            const expireTime = validation.data.expire_time ?? undefined;
            const meta = validation.data.meta ?? undefined;
            const tags = (validation.data.tags ?? []) as CreateExceptionListItemOptions['tags'];

            // Special case: endpoint exceptions list lives in the agnostic namespace and uses a dedicated API.
            // Users often refer to it by listId "endpoint_list".
            const res =
              input.params.listId === ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
                ? await exceptionsClient.createEndpointListItem({
                    comments: [],
                    description: validation.data.description,
                    entries: validation.data.entries as CreateExceptionListItemOptions['entries'],
                    itemId,
                    meta,
                    name: validation.data.name,
                    osTypes,
                    tags,
                    type: 'simple',
                  })
                : await exceptionsClient.createExceptionListItem({
                    comments: [],
                    description: validation.data.description,
                    entries: validation.data.entries as CreateExceptionListItemOptions['entries'],
                    expireTime,
                    itemId,
                    listId: input.params.listId,
                    meta,
                    name: validation.data.name,
                    namespaceType,
                    osTypes,
                    tags,
                    type: 'simple',
                  });
            return { results: [{ type: 'other', data: { operation: 'create', item: res } }] };
          } catch (e: unknown) {
            const err = e as Record<string, unknown>;
            const reason =
              typeof err?.getReason === 'function'
                ? (err as { getReason: () => unknown }).getReason()
                : Array.isArray(err?.reason)
                ? err.reason
                : undefined;
            return {
              results: [
                createErrorResult({
                  message:
                    `Failed to create exception list item (operation "create"). ` +
                    `Ensure required fields are present (name, description, entries) and entries are valid. ` +
                    `Underlying error: ${err?.message ?? String(e)}${
                      Array.isArray(reason) && reason.length
                        ? `. Validation reasons: ${(reason as string[]).slice(0, 5).join(' | ')}`
                        : ''
                    }`,
                  metadata: {
                    operation: 'create',
                    listId: input.params.listId,
                    namespaceType:
                      input.params.namespaceType ??
                      (input.params.listId === ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
                        ? 'agnostic'
                        : 'single'),
                    ...(Array.isArray(reason) ? { validation_reasons: reason } : {}),
                    expected_params_example: {
                      operation: 'create',
                      params: {
                        listId: input.params.listId,
                        namespaceType:
                          input.params.namespaceType ??
                          (input.params.listId === ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
                            ? 'agnostic'
                            : 'single'),
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
          const merged: Record<string, unknown> = {
            ...(input.params.rawItem ?? {}),
            ...(input.params.item ?? {}),
          };
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
              id: input.params.id,
              itemId: undefined,
              namespaceType,
            });

            const next: Record<string, unknown> = {
              ...(existing as Record<string, unknown>),
              ...merged,
            };

            const isEndpoint = existing?.list_id === ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id;

            const updateParams: UpdateExceptionListItemOptions = {
              _version: existing?._version,
              comments: existing?.comments ?? [],
              entries: (next.entries ??
                existing?.entries) as UpdateExceptionListItemOptions['entries'],
              expireTime: (next.expire_time ??
                existing?.expire_time) as UpdateExceptionListItemOptions['expireTime'],
              id: input.params.id,
              itemId: undefined,
              namespaceType: isEndpoint ? 'agnostic' : namespaceType,
              name: (next.name ?? existing?.name) as UpdateExceptionListItemOptions['name'],
              description: (next.description ??
                existing?.description) as UpdateExceptionListItemOptions['description'],
              meta: (next.meta ?? existing?.meta) as UpdateExceptionListItemOptions['meta'],
              osTypes: (next.os_types ??
                existing?.os_types ??
                []) as UpdateExceptionListItemOptions['osTypes'],
              tags: (next.tags ?? existing?.tags) as UpdateExceptionListItemOptions['tags'],
              type: (next.type ??
                existing?.type ??
                'simple') as UpdateExceptionListItemOptions['type'],
            };

            const res = isEndpoint
              ? await exceptionsClient.updateEndpointListItem(updateParams)
              : await exceptionsClient.updateExceptionListItem(updateParams);
            return { results: [{ type: 'other', data: { operation: 'update', item: res } }] };
          } catch (e: unknown) {
            const err = e as Record<string, unknown>;
            const reason =
              typeof err?.getReason === 'function'
                ? (err as { getReason: () => unknown }).getReason()
                : Array.isArray(err?.reason)
                ? err.reason
                : undefined;
            return {
              results: [
                createErrorResult({
                  message:
                    `Failed to update exception list item (operation "update"). ` +
                    `Underlying error: ${err?.message ?? String(e)}${
                      Array.isArray(reason) && reason.length
                        ? `. Validation reasons: ${(reason as string[]).slice(0, 5).join(' | ')}`
                        : ''
                    }`,
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
