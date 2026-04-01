/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { SkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import { compact } from 'lodash';

const ALLOWED_ENTITY_TYPES = ['host', 'user'] as const;

export const EXTRACT_EUID_FROM_SECURITY_ML_JOBS_INLINE_TOOL = `security.ml.jobs.extract_euid`;

export const extractEuidToolSchema = z.object({
  anomalyRecords: z
    .array(z.record(z.string(), z.unknown()))
    .describe('Array of anomaly records from ML jobs'),
});

export type ExtractEuidToolType = z.infer<typeof extractEuidToolSchema>;

export const extractEuidFromMlDataTool = (): SkillBoundedTool => ({
  id: EXTRACT_EUID_FROM_SECURITY_ML_JOBS_INLINE_TOOL,
  type: ToolType.builtin,
  schema: extractEuidToolSchema,
  description: `Use this tool to extract EUIDs (Entity Unique Identifiers) from security ML job anomaly records. This tool processes the provided anomaly records and identifies any associated EUIDs based on the entity types (e.g., users, hosts) present in the data. It returns a list of unique EUIDs that can be used for further investigation or analysis in the context of security entity behavior.`,
  handler: async (args) => {
    try {
      const toolArgs: ExtractEuidToolType = args as ExtractEuidToolType;
      const anomalyRecords = toolArgs.anomalyRecords;
      const euids = [];
      for (const record of anomalyRecords) {
        const ids: string[] = compact(
          ALLOWED_ENTITY_TYPES.map((entityType) => euid.getEuidFromObject(entityType, record))
        );
        if (!ids.length) {
          euids.push(undefined);
        } else if (ids.length === 1) {
          euids.push(ids[0]);
        } else if (ids.length > 1) {
          euids.push(ids);
        }
      }
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: 'euid',
            data: { euids },
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              error: `Error calculating EUIDs from anomaly records: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
            },
          },
        ],
      };
    }
  },
});
