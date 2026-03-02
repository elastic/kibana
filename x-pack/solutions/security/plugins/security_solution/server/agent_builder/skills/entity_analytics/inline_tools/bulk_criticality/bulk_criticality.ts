/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import type { SkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { getAssetCriticalityIndex } from '../../../../../../common/entity_analytics/asset_criticality';
import type { EntityAnalyticsSkillsContext } from '../../entity_analytics_skill';

import { ENTITY_ANALYTICS_BULK_CRITICALITY_INLINE_TOOL_ID } from '.';

const bulkCriticalitySchema = z.object({
  records: z
    .array(
      z.object({
        id_field: z
          .enum(['host.name', 'user.name', 'service.name'])
          .describe('Entity identifier field'),
        id_value: z.string().describe('Entity identifier value'),
        criticality_level: z
          .enum(['low_impact', 'medium_impact', 'high_impact', 'extreme_impact'])
          .describe('Criticality level to assign'),
      })
    )
    .min(1)
    .max(1000)
    .describe('Array of entity criticality records to upsert'),
  confirm: z.literal(true).describe('Required. Must be true to perform bulk upsert.'),
});

export const getBulkCriticalityInlineTool = (
  _ctx: EntityAnalyticsSkillsContext
): SkillBoundedTool => ({
  id: ENTITY_ANALYTICS_BULK_CRITICALITY_INLINE_TOOL_ID,
  type: ToolType.builtin,
  schema: bulkCriticalitySchema,
  description:
    'Bulk upsert asset criticality records for security entities. Use to set criticality levels for multiple hosts, users, or services at once.',
  handler: async ({ records }, { esClient, spaceId, logger }) => {
    try {
      logger.info(
        `${ENTITY_ANALYTICS_BULK_CRITICALITY_INLINE_TOOL_ID} tool called with ${records.length} records`
      );

      const index = getAssetCriticalityIndex(spaceId);
      const now = new Date().toISOString();

      const operations = records.flatMap((record) => {
        const docId = `${record.id_field}:${record.id_value}`;
        return [
          { index: { _index: index, _id: docId } },
          {
            id_field: record.id_field,
            id_value: record.id_value,
            criticality_level: record.criticality_level,
            '@timestamp': now,
            updated_at: now,
          },
        ];
      });

      const response = await esClient.asCurrentUser.bulk({
        refresh: 'wait_for',
        operations,
      });

      const successCount = response.items.filter((item) => !item.index?.error).length;
      const errorCount = response.items.filter((item) => item.index?.error).length;
      const errors = response.items
        .filter((item) => item.index?.error)
        .slice(0, 5)
        .map((item) => ({
          id: item.index?._id,
          error: item.index?.error?.reason,
        }));

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              operation: 'bulk_criticality',
              records_submitted: records.length,
              success_count: successCount,
              error_count: errorCount,
              ...(errors.length > 0 ? { sample_errors: errors } : {}),
            },
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Error performing bulk criticality upsert: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
            },
          },
        ],
      };
    }
  },
});
