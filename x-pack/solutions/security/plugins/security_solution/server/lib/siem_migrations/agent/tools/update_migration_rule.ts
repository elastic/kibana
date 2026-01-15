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
import { SIEM_MIGRATIONS_ASSISTANT_USER } from '../../../../../common/siem_migrations/constants';
import type { SiemMigrationsClientGetter } from './create_client_factory';

export const SIEM_MIGRATION_UPDATE_RULE_TOOL_ID = 'security.siem_migration.update_migration_rule';

const updateMigrationRuleSchema = z.object({
  rule_id: z.string().min(1).describe('The rule ID to update'),
  query: z.string().min(1).describe('The new ES|QL query for the rule'),
  title: z.string().optional().describe('Optional new title for the rule'),
  description: z.string().optional().describe('Optional new description for the rule'),
  comment: z
    .string()
    .optional()
    .describe('Optional comment explaining the changes made to the rule'),
});

/**
 * Tool to update a migrated rule's ES|QL query and other properties.
 * This saves the changes to the migration, allowing the user to later install the updated rule.
 */
export function createUpdateMigrationRuleTool(
  getClient: SiemMigrationsClientGetter
): StaticToolRegistration<typeof updateMigrationRuleSchema> {
  return {
    id: SIEM_MIGRATION_UPDATE_RULE_TOOL_ID,
    type: ToolType.builtin,
    description:
      "Update a migrated rule's ES|QL query or other properties. " +
      'Use this after the user confirms they are happy with the modified query. ' +
      'The rule_id is required, along with the new query. ' +
      'Optionally update the title, description, and add a comment explaining the changes.',
    schema: updateMigrationRuleSchema,
    tags: ['security', 'siem-migration'],
    handler: async (params, context) => {
      try {
        const client = await getClient(context.request);

        const updateData = {
          id: params.rule_id,
          elastic_rule: {
            query: params.query,
            query_language: 'esql' as const,
            ...(params.title && { title: params.title }),
            ...(params.description && { description: params.description }),
          },
          ...(params.comment && {
            comments: [
              {
                message: params.comment,
                created_at: new Date().toISOString(),
                created_by: SIEM_MIGRATIONS_ASSISTANT_USER,
              },
            ],
          }),
        };

        await client.data.items.update([updateData]);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                success: true,
                rule_id: params.rule_id,
                message: 'Rule updated successfully. The changes have been saved to the migration.',
                updated_fields: {
                  query: true,
                  title: !!params.title,
                  description: !!params.description,
                  comment_added: !!params.comment,
                },
              },
            },
          ],
        };
      } catch (error) {
        context.logger.error(`Error updating migration rule: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to update migration rule: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };
}
