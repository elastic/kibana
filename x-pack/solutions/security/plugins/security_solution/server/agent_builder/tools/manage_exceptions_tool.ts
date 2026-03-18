/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { securityTool } from './constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import type { ExperimentalFeatures } from '../../../common';

export const SECURITY_MANAGE_EXCEPTIONS_TOOL_ID = securityTool('manage_exceptions');

const manageExceptionsSchema = z.object({
  operation: z
    .enum(['create', 'find', 'find_overlaps'])
    .describe(
      'Operation to perform. "create" adds an exception to a rule, "find" lists exceptions on a rule, "find_overlaps" identifies duplicate or overlapping exception conditions.'
    ),
  rule_id: z.string().describe('The saved object ID of the rule to manage exceptions for.'),
  exception_name: z
    .string()
    .optional()
    .describe('Name for the new exception (required for create operation).'),
  exception_description: z
    .string()
    .optional()
    .describe('Description for the new exception (required for create operation).'),
  entries: z
    .array(
      z.object({
        field: z.string().describe('The field name to match, e.g. "process.name"'),
        operator: z
          .enum(['included', 'excluded'])
          .describe('Whether to include or exclude matches'),
        type: z.enum(['match', 'match_any', 'exists', 'wildcard']).describe('The match type'),
        value: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .describe('The value(s) to match. Use array for match_any.'),
      })
    )
    .optional()
    .describe(
      'Exception entry conditions. Required for create. Each entry specifies a field, operator, type, and value.'
    ),
  search_term: z
    .string()
    .optional()
    .describe('Search term to filter exceptions by name or description (for find operation).'),
});

export const manageExceptionsTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
): BuiltinToolDefinition<typeof manageExceptionsSchema> => {
  return {
    id: SECURITY_MANAGE_EXCEPTIONS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Manage rule exceptions: find existing exceptions on a rule, identify overlapping exception conditions, or prepare new exception payloads for false positive suppression. Essential for rule tuning.',
    schema: manageExceptionsSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        if (!experimentalFeatures?.aiRuleCreationEnabled) {
          return {
            status: 'unavailable',
            reason:
              'AI rule creation is not enabled. Enable it via experimental feature flag "aiRuleCreationEnabled".',
          };
        }
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (
      {
        operation,
        rule_id: ruleId,
        exception_name: exceptionName,
        exception_description: exceptionDescription,
        entries,
        search_term: searchTerm,
      },
      { request, esClient }
    ) => {
      logger.debug(
        `${SECURITY_MANAGE_EXCEPTIONS_TOOL_ID} tool called: operation=${operation}, rule_id=${ruleId}`
      );

      try {
        const [, startPlugins] = await core.getStartServices();
        const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);

        const rule = await rulesClient.get({ id: ruleId });
        const exceptionsList = (rule.params as Record<string, unknown>)?.exceptionsList as
          | Array<{ id: string; list_id: string; namespace_type: string; type: string }>
          | undefined;

        if (operation === 'find' || operation === 'find_overlaps') {
          if (!exceptionsList?.length) {
            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    message: `No exception lists found for rule "${rule.name}".`,
                    exceptions: [],
                  },
                },
              ],
            };
          }

          const allExceptions: Array<Record<string, unknown>> = [];
          for (const list of exceptionsList) {
            const exceptionItems = await esClient.asCurrentUser.search({
              index: `.kibana-exceptions-list-*`,
              query: {
                bool: {
                  must: [
                    { term: { 'exception-list.list_id': list.list_id } },
                    ...(searchTerm
                      ? [
                          {
                            multi_match: {
                              query: searchTerm,
                              fields: ['exception-list.name', 'exception-list.description'],
                            },
                          },
                        ]
                      : []),
                  ],
                },
              },
              size: 100,
            });

            const items = exceptionItems.hits.hits.map((hit) => {
              const source = hit._source as Record<string, unknown>;
              const exList = source['exception-list'] as Record<string, unknown>;
              return {
                id: hit._id,
                name: exList?.name,
                description: exList?.description,
                entries: exList?.entries,
                created_at: exList?.created_at,
              };
            });
            allExceptions.push(...items);
          }

          if (operation === 'find_overlaps') {
            const fieldSets = allExceptions.map((ex) => {
              const exEntries = (ex.entries ?? []) as Array<{ field: string; value: unknown }>;
              return {
                name: ex.name,
                fields: exEntries.map((e) => `${e.field}=${JSON.stringify(e.value)}`).sort(),
              };
            });

            const overlaps: Array<{
              exception_a: string;
              exception_b: string;
              shared_fields: string[];
            }> = [];
            for (let i = 0; i < fieldSets.length; i++) {
              for (let j = i + 1; j < fieldSets.length; j++) {
                const shared = fieldSets[i].fields.filter((f) => fieldSets[j].fields.includes(f));
                if (shared.length > 0) {
                  overlaps.push({
                    exception_a: fieldSets[i].name as string,
                    exception_b: fieldSets[j].name as string,
                    shared_fields: shared,
                  });
                }
              }
            }

            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    total_exceptions: allExceptions.length,
                    overlaps_found: overlaps.length,
                    overlaps,
                    message:
                      overlaps.length > 0
                        ? `Found ${overlaps.length} overlapping exception pair(s) among ${allExceptions.length} exceptions.`
                        : `No overlapping exceptions found among ${allExceptions.length} exceptions.`,
                  },
                },
              ],
            };
          }

          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  total: allExceptions.length,
                  exceptions: allExceptions,
                  message: `Found ${allExceptions.length} exception(s) for rule "${rule.name}".`,
                },
              },
            ],
          };
        }

        if (operation === 'create') {
          if (!exceptionName || !entries?.length) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: 'exception_name and entries are required to create an exception.',
                  },
                },
              ],
            };
          }

          const exceptionItems = entries.map((e) => ({
            field: e.field,
            operator: e.operator,
            type: e.type,
            ...(e.value !== undefined ? { value: e.value } : {}),
          }));

          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  message: `Exception "${exceptionName}" with ${entries.length} condition(s) prepared for rule "${rule.name}". To apply, use the Kibana API: POST /api/detection_engine/rules/${ruleId}/exceptions with the items payload.`,
                  prepared_exception: {
                    name: exceptionName,
                    description: exceptionDescription ?? '',
                    type: 'simple',
                    entries: exceptionItems,
                    rule_name: rule.name,
                    rule_id: ruleId,
                  },
                },
              },
            ],
          };
        }

        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Unknown operation: ${operation}` },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in ${SECURITY_MANAGE_EXCEPTIONS_TOOL_ID} tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error managing exceptions: ${error.message}`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'detection', 'exceptions', 'tuning'],
  };
};
