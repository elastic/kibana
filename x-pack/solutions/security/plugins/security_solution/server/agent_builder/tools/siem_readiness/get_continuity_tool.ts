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
import { getContinuity } from '../../../lib/siem_readiness/dimensions';
import { SIEM_READINESS_CONTINUITY_TOOL_ID } from './tool_ids';

const schema = z.object({});

export const getContinuityTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  isServerless: boolean
): BuiltinToolDefinition<typeof schema> => ({
  id: SIEM_READINESS_CONTINUITY_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Retrieves SIEM ingest pipeline continuity health. Returns active pipelines with document counts, failure rates, and which indices they serve. Includes an overall health status (healthy / actionsRequired / noData) and actionable findings for pipelines with critical failure rates.',
  schema,
  tags: ['security', 'siem-readiness', 'continuity'],
  availability: {
    cacheMode: 'space',
    handler: async ({ request }) => {
      return getAgentBuilderResourceAvailability({ core, request, logger });
    },
  },
  handler: async (_params, { esClient, logger: handlerLogger }) => {
    try {
      const payload = await getContinuity({
        esClient: esClient.asCurrentUser,
        isServerless,
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
            data: { message: `Error fetching SIEM continuity: ${e.message ?? 'unknown error'}` },
          },
        ],
      };
    }
  },
});
