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
import type { Logger } from '@kbn/logging';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import type { ExperimentalFeatures } from '../../../common';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { securityTool } from './constants';

const RESOURCES_INDEX_BASE = '.kibana-siem-rule-migrations-resources' as const;

const getResourcesIndexName = (spaceId: string) => `${RESOURCES_INDEX_BASE}-${spaceId}`;

const migrationIdField = z
  .string()
  .uuid()
  .describe('UUID of the migration that scopes the resources.');

const resourceTypeSchema = z
  .enum(['macro', 'lookup'])
  .describe(
    'Resource kind. `macro` = reusable query fragment, `lookup` = key/value mapping table. These two are the canonical Splunk-source resource kinds tracked by the migration data model; other vendor-specific kinds (qradar reference data, etc.) are not exposed via this chat tool.'
  );

/* -------------------------------------------------------------------------- */
/*  List migration resources (read-only)                                       */
/* -------------------------------------------------------------------------- */

const listSchema = z.object({
  migration_id: migrationIdField,
  type: resourceTypeSchema.optional().describe('Optional filter by resource type.'),
  max_results: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .default(50)
    .describe('Maximum resources to return (default 50, max 200).'),
});

export const SECURITY_MIGRATION_RESOURCES_LIST_TOOL_ID = securityTool('migration_resources_list');

export const migrationResourcesListTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
): BuiltinToolDefinition<typeof listSchema> => ({
  id: SECURITY_MIGRATION_RESOURCES_LIST_TOOL_ID,
  type: ToolType.builtin,
  description:
    'List context resources attached to a SIEM rule migration (macros, lists, lookups). Use this BEFORE adding new context, to surface what is already attached and avoid duplicates.',
  schema: listSchema,
  tags: ['security', 'siem-migrations', 'resources', 'list'],
  availability: {
    cacheMode: 'space',
    handler: async ({ request }) => {
      if (!experimentalFeatures?.automaticMigrationSkillsEnabled) {
        return {
          status: 'unavailable',
          reason:
            'Automatic Migration Skills are not enabled. Set the `automaticMigrationSkillsEnabled` experimental feature flag.',
        };
      }
      return getAgentBuilderResourceAvailability({ core, request, logger });
    },
  },
  handler: async (
    { migration_id: migrationId, type, max_results: maxResults },
    { esClient, spaceId }
  ) => {
    try {
      const index = getResourcesIndexName(spaceId);

      const must: Array<Record<string, unknown>> = [{ term: { migration_id: migrationId } }];
      if (type) {
        must.push({ term: { type } });
      }

      const result = await esClient.asCurrentUser.search<Record<string, unknown>>({
        index,
        size: maxResults,
        query: { bool: { must } },
        _source: ['migration_id', 'type', 'name', 'content', 'metadata', 'updated_at'],
      });

      const resources = result.hits.hits.map((hit) => ({
        id: hit._id,
        ...(hit._source ?? {}),
      }));

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              migration_id: migrationId,
              total: resources.length,
              resources,
            },
          },
        ],
      };
    } catch (error) {
      logger.error(`migration_resources_list failed: ${error.message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to list resources: ${error.message}`,
            },
          },
        ],
      };
    }
  },
});
