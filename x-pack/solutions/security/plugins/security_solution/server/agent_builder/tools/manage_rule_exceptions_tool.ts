/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { securityTool } from './constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';

export const SECURITY_MANAGE_RULE_EXCEPTIONS_TOOL_ID = securityTool('manage_rule_exceptions');

const manageRuleExceptionsSchema = z.object({
  action: z
    .enum(['create', 'find', 'read', 'delete'])
    .describe(
      'The action to perform. "create" adds exception items to a rule, "find" lists items in an exception list, "read" gets a single item, "delete" removes an item.'
    ),
  rule_id: z
    .string()
    .optional()
    .describe(
      'The rule UUID (id) to add exceptions to. Required for "create" action.'
    ),
  exception_items: z
    .string()
    .optional()
    .describe(
      'JSON string array of exception items to create. Each item must have: type ("simple"), name, description, entries (array of {field, operator ("included"/"excluded"), type ("match"/"match_any"/"exists"/"wildcard"/"list"), value}). Optional: namespace_type, os_types, tags, expire_time, comments. Required for "create" action.'
    ),
  list_id: z
    .string()
    .optional()
    .describe(
      'The exception list ID to search within. Required for "find" action.'
    ),
  namespace_type: z
    .enum(['single', 'agnostic'])
    .optional()
    .describe('Namespace type for the exception list. Defaults to "single".'),
  item_id: z
    .string()
    .optional()
    .describe(
      'The exception list item ID. Required for "read" and "delete" actions.'
    ),
  page: z.number().optional().describe('Page number for "find" action. Defaults to 1.'),
  per_page: z.number().optional().describe('Items per page for "find" action. Defaults to 20.'),
  filter: z.string().optional().describe('KQL filter for "find" action.'),
});

export const manageRuleExceptionsTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof manageRuleExceptionsSchema> => {
  const getBaseUrl = () => {
    const { protocol, hostname, port } = core.http.getServerInfo();
    const basePath = core.http.basePath.serverBasePath;
    return `${protocol}://${hostname}:${port}${basePath}`;
  };

  const getAuthHeaders = (request: { headers: { authorization?: string | string[] } }) => {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }
    return {
      'Content-Type': 'application/json',
      'kbn-xsrf': 'true',
      'elastic-api-version': '2023-10-31',
      Authorization: authHeader as string,
    };
  };

  return {
    id: SECURITY_MANAGE_RULE_EXCEPTIONS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Manage exception list items for Elastic Security detection rules. Supports creating exceptions for a rule (to suppress false positives), finding/listing exceptions on a list, reading a single exception item, and deleting exception items.',
    schema: manageRuleExceptionsSchema,
    tags: ['security', 'detection', 'exceptions', 'siem'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (params, { request }) => {
      try {
        const headers = getAuthHeaders(request);
        if (!headers) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: { message: 'No authorization header found on the request' },
              },
            ],
          };
        }

        const baseUrl = getBaseUrl();
        const { action } = params;

        if (action === 'create') {
          if (!params.rule_id || !params.exception_items) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message:
                      'Both rule_id and exception_items are required for the "create" action',
                  },
                },
              ],
            };
          }

          const items = JSON.parse(params.exception_items);
          const url = `${baseUrl}/api/detection_engine/rules/${params.rule_id}/exceptions`;

          logger.debug(
            `Creating ${items.length} exception item(s) for rule ${params.rule_id}`
          );

          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ items }),
          });

          const result = await response.json();

          if (!response.ok) {
            logger.error(`Failed to create exception items: ${JSON.stringify(result)}`);
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Failed to create exception items: ${result.message || response.statusText}`,
                    statusCode: response.status,
                    details: result,
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
                  success: true,
                  message: `Created ${items.length} exception item(s) for rule ${params.rule_id}`,
                  items: result,
                },
              },
            ],
          };
        }

        if (action === 'find') {
          if (!params.list_id) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: { message: 'list_id is required for the "find" action' },
                },
              ],
            };
          }

          const ns = params.namespace_type || 'single';
          const searchParams = new URLSearchParams({
            list_id: params.list_id,
            namespace_type: ns,
            page: String(params.page || 1),
            per_page: String(params.per_page || 20),
          });
          if (params.filter) {
            searchParams.set('filter', params.filter);
          }

          const url = `${baseUrl}/api/exception_lists/items/_find?${searchParams.toString()}`;

          const response = await fetch(url, { method: 'GET', headers });
          const result = await response.json();

          if (!response.ok) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Failed to find exception items: ${result.message || response.statusText}`,
                    statusCode: response.status,
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
                  total: result.total,
                  page: result.page,
                  per_page: result.per_page,
                  items: result.data,
                },
              },
            ],
          };
        }

        if (action === 'read') {
          if (!params.item_id) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: { message: 'item_id is required for the "read" action' },
                },
              ],
            };
          }

          const ns = params.namespace_type || 'single';
          const url = `${baseUrl}/api/exception_lists/items?item_id=${encodeURIComponent(params.item_id)}&namespace_type=${ns}`;

          const response = await fetch(url, { method: 'GET', headers });
          const result = await response.json();

          if (!response.ok) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Failed to read exception item: ${result.message || response.statusText}`,
                    statusCode: response.status,
                  },
                },
              ],
            };
          }

          return {
            results: [{ type: ToolResultType.other, data: { item: result } }],
          };
        }

        if (action === 'delete') {
          if (!params.item_id) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: { message: 'item_id is required for the "delete" action' },
                },
              ],
            };
          }

          const ns = params.namespace_type || 'single';
          const url = `${baseUrl}/api/exception_lists/items?item_id=${encodeURIComponent(params.item_id)}&namespace_type=${ns}`;

          const response = await fetch(url, { method: 'DELETE', headers });
          const result = await response.json();

          if (!response.ok) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Failed to delete exception item: ${result.message || response.statusText}`,
                    statusCode: response.status,
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
                  success: true,
                  message: `Exception item "${params.item_id}" deleted successfully`,
                },
              },
            ],
          };
        }

        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Unknown action: ${action}` },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in manage_rule_exceptions tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Error managing rule exceptions: ${error.message}` },
            },
          ],
        };
      }
    },
  };
};
