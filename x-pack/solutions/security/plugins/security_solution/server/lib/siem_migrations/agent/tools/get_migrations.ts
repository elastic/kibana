/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import type { SiemMigrationsClientGetter } from './create_client_factory';

export const SIEM_MIGRATION_GET_MIGRATIONS_TOOL_ID = 'security.siem_migration.get_migrations';

const getMigrationsSchema = z.object({});

/**
 * Tool to list all SIEM rule migrations with their stats.
 * Returns migration ID, name, status, and rule counts.
 */
export function createGetMigrationsTool(
  getClient: SiemMigrationsClientGetter
): StaticToolRegistration<typeof getMigrationsSchema> {
  return {
    id: SIEM_MIGRATION_GET_MIGRATIONS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'List all SIEM rule migrations with their statistics. ' +
      'Returns migration ID, name, status, and counts of rules (total, pending, completed, failed). ' +
      'Use this to find the migration ID before fetching or modifying specific rules.',
    schema: getMigrationsSchema,
    tags: ['security', 'siem-migration'],
    handler: async (_params, context) => {
      try {
        const client = await getClient(context.request);
        const allStats = await client.task.getAllStats();

        // Format the response for better readability
        const migrations = allStats.map((stat) => ({
          id: stat.id,
          name: stat.name,
          status: stat.status,
          rules: stat.items,
          created_at: stat.created_at,
          last_updated_at: stat.last_updated_at,
        }));

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                total: migrations.length,
                migrations,
              },
            },
          ],
        };
      } catch (error) {
        context.logger.error(`Error fetching migrations: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch migrations: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };
}
