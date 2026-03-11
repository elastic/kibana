/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { SkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { ModuleJob } from '@kbn/ml-plugin/common/types/modules';
import { isJobStarted } from '../../../../../common/machine_learning/helpers';
import type { LEGACY_ML_GROUP_ID, ML_GROUP_ID } from '../../../../../common/constants';
import { DEFAULT_ANOMALY_SCORE, ML_GROUP_IDS } from '../../../../../common/constants';
import { IdentifierType } from '../../../../../common/api/entity_analytics/common/common.gen';
import type { EntityType } from '../../../../../common/api/entity_analytics';
import type { SecurityMlJobsSkillsContext } from '../security_ml_jobs_skill';

export const EXTRACT_EUID_FROM_SECURITY_ML_JOBS_INLINE_TOOL = `security.ml.jobs.extract_euid`;

export const mlJobsToolSchema = z.object({
  anomalyRecords: z.array(z.unknown()).describe('Array of anomaly records from ML jobs'),
});

export const extractEuidFromMlDataTool = (ctx: SecurityMlJobsSkillsContext): SkillBoundedTool => ({
  id: EXTRACT_EUID_FROM_SECURITY_ML_JOBS_INLINE_TOOL,
  type: ToolType.builtin,
  schema: mlJobsToolSchema,
  description: `Call this tool to find relevant security ML jobs and their corresponding indices to investigate anomalous or unusual behavior in your environment`,
  handler: async (args, context) => {
    try {
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: 'euid',
            data: { euids: [] }, // Placeholder for extracted EUIDs
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              error: `Error retrieving security ml job data: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
            },
          },
        ],
      };
    }
  },
});
