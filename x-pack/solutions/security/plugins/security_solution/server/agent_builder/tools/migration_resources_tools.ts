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
  .enum(['macro', 'list', 'lookup'])
  .describe(
    'Resource kind. `macro` = reusable query fragment, `list` = static enumeration, `lookup` = key/value mapping table.'
  );

/* -------------------------------------------------------------------------- */
/*  Tool 1: list migration resources                                          */
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

/* -------------------------------------------------------------------------- */
/*  Tool 2: upsert a migration resource (destructive — requires confirmation) */
/* -------------------------------------------------------------------------- */

const upsertSchema = z.object({
  migration_id: migrationIdField,
  type: resourceTypeSchema,
  name: z
    .string()
    .min(1)
    .describe(
      'Unique-within-migration resource name. `migration_id + type + name` is the natural key — supplying an existing tuple replaces it.'
    ),
  content: z
    .string()
    .min(1)
    .describe(
      'Resource body: macro definition / list contents / lookup payload (JSON-serialisable string).'
    ),
  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Optional free-form metadata blob carried on the resource.'),
  confirm: z
    .literal(true)
    .describe(
      'Operator consent for the upsert. Required because a matching `(migration_id, type, name)` overwrites the prior content. Schema-enforced consent — never invoke without it.'
    ),
});

export const SECURITY_MIGRATION_RESOURCE_UPSERT_TOOL_ID = securityTool('migration_resource_upsert');

export const migrationResourceUpsertTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
): BuiltinToolDefinition<typeof upsertSchema> => ({
  id: SECURITY_MIGRATION_RESOURCE_UPSERT_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Create or replace a migration context resource (macro, list, or lookup). Destructive when a matching `(migration_id, type, name)` already exists. Requires explicit `confirm: true` consent — the schema enforces this. The new content applies on the NEXT translation run, not retroactively to already-translated rules.',
  schema: upsertSchema,
  tags: ['security', 'siem-migrations', 'resources', 'upsert', 'destructive'],
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
    { migration_id: migrationId, type, name, content, metadata, confirm: _confirm },
    { esClient, spaceId }
  ) => {
    try {
      const index = getResourcesIndexName(spaceId);

      const existing = await esClient.asCurrentUser.search<{ migration_id?: string }>({
        index,
        size: 1,
        query: {
          bool: {
            must: [
              { term: { migration_id: migrationId } },
              { term: { type } },
              { term: { name: name as string } },
            ],
          },
        },
      });

      const now = new Date().toISOString();
      const existingId = existing.hits.hits[0]?._id;
      const replaced = Boolean(existingId);

      if (existingId) {
        await esClient.asCurrentUser.update({
          index,
          id: existingId,
          doc: { content, metadata, updated_at: now },
          refresh: 'wait_for',
        });
      } else {
        await esClient.asCurrentUser.index({
          index,
          document: {
            migration_id: migrationId,
            type,
            name,
            content,
            metadata,
            updated_at: now,
          },
          refresh: 'wait_for',
        });
      }

      logger.info(
        `Migration resource (${type}/${name}) on migration ${migrationId} ${
          replaced ? 'replaced' : 'created'
        }.`
      );

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              success: true,
              migration_id: migrationId,
              type,
              name,
              replaced,
              note: 'New content applies on the NEXT translation run; previously translated rules are unaffected.',
            },
          },
        ],
      };
    } catch (error) {
      logger.error(`migration_resource_upsert failed: ${error.message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to upsert resource (${type}/${name}): ${error.message}`,
            },
          },
        ],
      };
    }
  },
});

/* -------------------------------------------------------------------------- */
/*  Tool 3: remove a migration resource (destructive — requires confirmation) */
/* -------------------------------------------------------------------------- */

const removeSchema = z.object({
  migration_id: migrationIdField,
  type: resourceTypeSchema,
  name: z.string().min(1),
  confirm: z.literal(true).describe('Operator consent for deletion. Schema-enforced — never omit.'),
});

export const SECURITY_MIGRATION_RESOURCE_REMOVE_TOOL_ID = securityTool('migration_resource_remove');

export const migrationResourceRemoveTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
): BuiltinToolDefinition<typeof removeSchema> => ({
  id: SECURITY_MIGRATION_RESOURCE_REMOVE_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Permanently remove a migration context resource. Destructive — requires explicit `confirm: true` consent (schema-enforced). The next translation run will no longer see the removed resource.',
  schema: removeSchema,
  tags: ['security', 'siem-migrations', 'resources', 'delete', 'destructive'],
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
    { migration_id: migrationId, type, name, confirm: _confirm },
    { esClient, spaceId }
  ) => {
    try {
      const index = getResourcesIndexName(spaceId);

      const existing = await esClient.asCurrentUser.search<{ migration_id?: string }>({
        index,
        size: 1,
        query: {
          bool: {
            must: [
              { term: { migration_id: migrationId } },
              { term: { type } },
              { term: { name: name as string } },
            ],
          },
        },
      });

      const existingId = existing.hits.hits[0]?._id;
      if (!existingId) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Resource (${type}/${name}) not found on migration ${migrationId}.`,
              },
            },
          ],
        };
      }

      await esClient.asCurrentUser.delete({
        index,
        id: existingId,
        refresh: 'wait_for',
      });

      logger.info(`Migration resource (${type}/${name}) on migration ${migrationId} removed.`);

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              success: true,
              migration_id: migrationId,
              type,
              name,
              note: 'Removed. The next translation run will not see this resource.',
            },
          },
        ],
      };
    } catch (error) {
      logger.error(`migration_resource_remove failed: ${error.message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to remove resource (${type}/${name}): ${error.message}`,
            },
          },
        ],
      };
    }
  },
});
