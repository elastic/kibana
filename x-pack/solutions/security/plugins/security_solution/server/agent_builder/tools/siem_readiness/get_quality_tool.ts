/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { Logger } from '@kbn/logging';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { getQuality } from '../../../lib/siem_readiness/dimensions';
import { SIEM_READINESS_QUALITY_TOOL_ID } from './tool_ids';

const schema = z.object({});

export const getQualityTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof schema> => ({
  id: SIEM_READINESS_QUALITY_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Retrieves SIEM data quality health based on ECS (Elastic Common Schema) compatibility check results. Returns indices with incompatible field mappings including field-level details. Includes an overall health status (healthy / actionsRequired / noData) and actionable findings. Note: results are only available after running a data quality check from the Security > Data Quality dashboard.',
  schema,
  tags: ['security', 'siem-readiness', 'quality'],
  availability: {
    cacheMode: 'space',
    handler: async ({ request }) => {
      return getAgentBuilderResourceAvailability({ core, request, logger });
    },
  },
  handler: async (_params, { esClient, logger: handlerLogger }) => {
    try {
      const payload = await getQuality({
        esClient: esClient.asCurrentUser,
        logger: handlerLogger,
      });
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: payload,
          },
        ],
      };
    } catch (error: unknown) {
      const e = error as { message?: string };
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.error,
            data: { message: `Error fetching SIEM quality: ${e.message ?? 'unknown error'}` },
          },
        ],
      };
    }
  },
});
