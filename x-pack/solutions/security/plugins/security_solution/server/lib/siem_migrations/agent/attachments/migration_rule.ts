/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { SIEM_MIGRATION_RULE_ATTACHMENT_TYPE_ID } from '../../../../../common/constants';
import type {
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
} from '../../../../plugin_contract';
import type { SiemMigrationsClientGetter } from '../tools/create_client_factory';
import { SIEM_MIGRATION_TOOL_IDS } from '../tools';

const migrationRuleAttachmentDataSchema = z.object({
  migration_id: z.string().min(1),
  rule_id: z.string().min(1),
  attachmentLabel: z.string().optional(),
});

export type MigrationRuleAttachmentData = z.infer<typeof migrationRuleAttachmentDataSchema>;

export function createMigrationRuleAttachmentType({
  core,
  logger,
  getClient,
}: {
  core: CoreSetup<SecuritySolutionPluginStartDependencies, SecuritySolutionPluginStart>;
  logger: Logger;
  getClient: SiemMigrationsClientGetter;
}): AttachmentTypeDefinition<
  typeof SIEM_MIGRATION_RULE_ATTACHMENT_TYPE_ID,
  MigrationRuleAttachmentData
> {
  return {
    id: SIEM_MIGRATION_RULE_ATTACHMENT_TYPE_ID,
    validate: (input) => {
      const parsed = migrationRuleAttachmentDataSchema.safeParse(input);
      if (parsed.success) {
        return { valid: true, data: parsed.data };
      }
      return { valid: false, error: parsed.error.message };
    },
    format: (attachment, context) => {
      const { migration_id, rule_id } = attachment.data;

      return {
        getRepresentation: async () => {
          try {
            const client = await getClient(context.request);

            const result = await client.data.items.get(migration_id, {
              filters: {
                ids: [rule_id],
              },
              size: 1,
              from: 0,
            });

            if (result.data.length === 0) {
              return {
                type: 'text',
                value: `SIEM Migration Rule - Migration ID: ${migration_id}, Rule ID: ${rule_id}.\n\nError: Migration rule not found.`,
              };
            }

            const rule = result.data[0];

            // Format rule data for representation
            const representation = [
              `SIEM Migration Rule Details:`,
              `\nMigration ID: ${migration_id}`,
              `Rule ID: ${rule_id}`,
              `Title: ${rule.original_rule.title}`,
              `Vendor: ${rule.original_rule.vendor}`,
              `Status: ${rule.status}`,
              `Translation Result: ${rule.translation_result || 'N/A'}`,
              `\nOriginal Rule:`,
              `  Query Language: ${rule.original_rule.query_language}`,
              `  Query: ${rule.original_rule.query}`,
              rule.original_rule.description
                ? `  Description: ${rule.original_rule.description}`
                : '',
              rule.elastic_rule
                ? `\nTranslated Rule (ES|QL):\n  Title: ${rule.elastic_rule.title}\n  Query: ${rule.elastic_rule.query
                }${rule.elastic_rule.description
                  ? `\n  Description: ${rule.elastic_rule.description}`
                  : ''
                }${rule.elastic_rule.severity ? `\n  Severity: ${rule.elastic_rule.severity}` : ''
                }${rule.elastic_rule.prebuilt_rule_id
                  ? `\n  Prebuilt Rule ID: ${rule.elastic_rule.prebuilt_rule_id}`
                  : ''
                }`
                : '\nTranslated Rule: Not yet translated',
              rule.comments && rule.comments.length > 0
                ? `\nComments:\n${rule.comments.map((c) => `  - ${c.message}`).join('\n')}`
                : '',
            ]
              .filter(Boolean)
              .join('\n');

            return {
              type: 'text',
              value: representation,
            };
          } catch (error) {
            logger.error(
              `Failed to fetch migration rule ${rule_id} from migration ${migration_id} for representation: ${error instanceof Error ? error.message : String(error)
              }`
            );
            return {
              type: 'text',
              value: `SIEM Migration Rule - Migration ID: ${migration_id}, Rule ID: ${rule_id}.\n\nError: Failed to fetch rule details. Use the get_migration_rule tool to retry.`,
            };
          }
        },
        getBoundedTools: () => [
          {
            id: `get_migration_rule_${attachment.id}`,
            type: ToolType.builtin,
            description: `Refresh or update details for migration rule ${rule_id} from migration ${migration_id}. Use this only if you need the latest data or if the initial attachment data is missing.`,
            schema: z.object({}),
            handler: async (_args, context) => {
              try {
                const client = await getClient(context.request);

                const result = await client.data.items.get(migration_id, {
                  filters: {
                    ids: [rule_id],
                  },
                  size: 1,
                  from: 0,
                });

                if (result.data.length === 0) {
                  return {
                    results: [
                      {
                        type: ToolResultType.error,
                        data: {
                          message: `Migration rule not found: rule_id=${rule_id}, migration_id=${migration_id}`,
                        },
                      },
                    ],
                  };
                }

                const rule = result.data[0];

                // Format rule for better readability
                const formattedRule = {
                  id: rule.id,
                  title: rule.original_rule.title,
                  vendor: rule.original_rule.vendor,
                  status: rule.status,
                  translation_result: rule.translation_result,
                  original_rule: {
                    query: rule.original_rule.query,
                    query_language: rule.original_rule.query_language,
                    description: rule.original_rule.description,
                  },
                  elastic_rule: rule.elastic_rule
                    ? {
                      title: rule.elastic_rule.title,
                      query: rule.elastic_rule.query,
                      query_language: rule.elastic_rule.query_language,
                      description: rule.elastic_rule.description,
                      severity: rule.elastic_rule.severity,
                      prebuilt_rule_id: rule.elastic_rule.prebuilt_rule_id,
                    }
                    : null,
                  comments: rule.comments,
                };

                return {
                  results: [
                    {
                      type: ToolResultType.other,
                      data: formattedRule,
                    },
                  ],
                };
              } catch (error) {
                logger.error(
                  `Failed to fetch migration rule ${rule_id} from migration ${migration_id}: ${error instanceof Error ? error.message : String(error)
                  }`
                );
                return {
                  results: [
                    {
                      type: ToolResultType.error,
                      data: {
                        message: `Failed to fetch migration rule: ${error instanceof Error ? error.message : String(error)
                          }`,
                      },
                    },
                  ],
                };
              }
            },
          },
        ],
      };
    },
    getTools: () => [...SIEM_MIGRATION_TOOL_IDS],
    getAgentDescription: () =>
      `A SIEM migration rule attachment has been added to this conversation. The full rule details including original query (SPL/AQL), translated ES|QL query, translation status, and comments are included in the attachment representation.

IMPORTANT: When this attachment is first added, you MUST describe the available capabilities to the user based on the tools you have access to. Explain what actions they can take with this attached migration rule, such as:
- Viewing and understanding the rule details
- Installing the rule(s) into Elastic Security
- Starting or retrying the migration for specific rules
- Updating the translated rule if needed
- Getting more information about the migration

Be proactive and helpful - don't wait for the user to ask what they can do. Present the capabilities clearly and ask what they would like to do with the attached rule.`,
  };
}
