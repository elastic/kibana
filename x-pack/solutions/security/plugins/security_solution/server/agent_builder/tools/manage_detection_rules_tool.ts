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

export const SECURITY_MANAGE_DETECTION_RULES_TOOL_ID = securityTool('manage_detection_rules');

const manageDetectionRulesSchema = z.object({
  action: z
    .enum(['read', 'find', 'patch', 'delete'])
    .describe(
      'The action to perform. "read" gets a single rule by ID, "find" searches/lists rules, "patch" updates specific fields on a rule, "delete" removes a rule.'
    ),
  id: z
    .string()
    .optional()
    .describe(
      'The rule UUID (internal ID). Used by "read", "patch", and "delete" actions. Either id or rule_id is required for those actions.'
    ),
  rule_id: z
    .string()
    .optional()
    .describe(
      'The user-facing rule_id string. Alternative to id for "read" and "delete" actions.'
    ),
  patch_body: z
    .string()
    .optional()
    .describe(
      'JSON string of fields to update on the rule. Must include "id" or "rule_id" to identify the rule. Only the fields provided will be updated (partial update). Required for "patch" action. Example: {"id": "...", "enabled": false, "tags": ["updated"]}'
    ),
  filter: z
    .string()
    .optional()
    .describe(
      'KQL filter string for "find" action. Example: "alert.attributes.tags: \\"my-tag\\"" or "alert.attributes.name: mimikatz".'
    ),
  sort_field: z
    .string()
    .optional()
    .describe('Field to sort by for "find" action. Example: "name", "enabled", "updated_at".'),
  sort_order: z
    .enum(['asc', 'desc'])
    .optional()
    .describe('Sort direction for "find" action. Defaults to "desc".'),
  page: z.number().optional().describe('Page number for "find" action. Defaults to 1.'),
  per_page: z
    .number()
    .optional()
    .describe('Results per page for "find" action. Defaults to 20.'),
  fields: z
    .string()
    .optional()
    .describe(
      'Comma-separated list of fields to include in "find" results. If omitted, all fields are returned.'
    ),
});

export const manageDetectionRulesTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof manageDetectionRulesSchema> => {
  const getBaseUrl = () => {
    const { protocol, hostname, port } = core.http.getServerInfo();
    const basePath = core.http.basePath.serverBasePath;
    return `${protocol}://${hostname}:${port}${basePath}`;
  };

  const getHeaders = (request: { headers: { authorization?: string | string[] } }) => {
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
    id: SECURITY_MANAGE_DETECTION_RULES_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Manage detection rules in Elastic Security. Supports reading a single rule by ID, searching/listing rules with filters, patching (partially updating) rule fields, and deleting rules. Use for rule lifecycle management after creation.',
    schema: manageDetectionRulesSchema,
    tags: ['security', 'detection', 'rule-management', 'siem'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (params, { request }) => {
      try {
        const headers = getHeaders(request);
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
        const rulesUrl = `${baseUrl}/api/detection_engine/rules`;
        const { action } = params;

        if (action === 'read') {
          if (!params.id && !params.rule_id) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: { message: 'Either id or rule_id is required for the "read" action' },
                },
              ],
            };
          }

          const searchParams = new URLSearchParams();
          if (params.id) searchParams.set('id', params.id);
          if (params.rule_id) searchParams.set('rule_id', params.rule_id);
          const url = `${rulesUrl}?${searchParams.toString()}`;

          const response = await fetch(url, { method: 'GET', headers });
          const result = await response.json();

          if (!response.ok) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Failed to read rule: ${result.message || response.statusText}`,
                    statusCode: response.status,
                  },
                },
              ],
            };
          }

          return {
            results: [{ type: ToolResultType.other, data: { rule: result } }],
          };
        }

        if (action === 'find') {
          const searchParams = new URLSearchParams({
            page: String(params.page || 1),
            per_page: String(params.per_page || 20),
            sort_order: params.sort_order || 'desc',
          });
          if (params.filter) searchParams.set('filter', params.filter);
          if (params.sort_field) searchParams.set('sort_field', params.sort_field);
          if (params.fields) searchParams.set('fields', params.fields);

          const url = `${rulesUrl}/_find?${searchParams.toString()}`;

          const response = await fetch(url, { method: 'GET', headers });
          const result = await response.json();

          if (!response.ok) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Failed to find rules: ${result.message || response.statusText}`,
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
                  per_page: result.perPage,
                  rules: result.data,
                },
              },
            ],
          };
        }

        if (action === 'patch') {
          if (!params.patch_body) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message:
                      'patch_body is required for the "patch" action. Must be a JSON string with "id" or "rule_id" and the fields to update.',
                  },
                },
              ],
            };
          }

          const patchData = JSON.parse(params.patch_body);

          logger.debug(
            `Patching detection rule: ${patchData.id || patchData.rule_id}`
          );

          const response = await fetch(rulesUrl, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(patchData),
          });

          const result = await response.json();

          if (!response.ok) {
            logger.error(`Failed to patch detection rule: ${JSON.stringify(result)}`);
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Failed to patch rule: ${result.message || response.statusText}`,
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
                  message: `Rule "${result.name}" updated successfully`,
                  rule: result,
                },
              },
            ],
          };
        }

        if (action === 'delete') {
          if (!params.id && !params.rule_id) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: 'Either id or rule_id is required for the "delete" action',
                  },
                },
              ],
            };
          }

          const searchParams = new URLSearchParams();
          if (params.id) searchParams.set('id', params.id);
          if (params.rule_id) searchParams.set('rule_id', params.rule_id);
          const url = `${rulesUrl}?${searchParams.toString()}`;

          logger.debug(
            `Deleting detection rule: ${params.id || params.rule_id}`
          );

          const response = await fetch(url, { method: 'DELETE', headers });
          const result = await response.json();

          if (!response.ok) {
            logger.error(`Failed to delete detection rule: ${JSON.stringify(result)}`);
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Failed to delete rule: ${result.message || response.statusText}`,
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
                  message: `Rule "${result.name}" (${result.id}) deleted successfully`,
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
        logger.error(`Error in manage_detection_rules tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Error managing detection rules: ${error.message}` },
            },
          ],
        };
      }
    },
  };
};
