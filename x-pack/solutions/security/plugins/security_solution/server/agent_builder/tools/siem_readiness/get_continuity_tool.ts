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
import type { MainCategories } from '@kbn/siem-readiness';
import {
  getIndexCategoryMap,
  isCriticalFailureRate,
  filterPipelinesByCategories,
} from '@kbn/siem-readiness';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { getContinuity } from '../../../lib/siem_readiness/dimensions';
import { fetchCategories } from '../../../lib/siem_readiness/fetchers';
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
    'Retrieves SIEM ingest pipeline continuity health. Returns active pipelines with document counts, failure rates, and which indices they serve — filtered to pipelines that serve categorized SIEM indices. Includes an overall health status (healthy / actionsRequired / noData) and actionable findings for pipelines with critical failure rates.',
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
      const [payload, categoriesResult] = await Promise.all([
        getContinuity({ esClient: esClient.asCurrentUser, isServerless, logger: handlerLogger }),
        fetchCategories({ esClient: esClient.asCurrentUser, logger: handlerLogger }),
      ]);

      const indexToCategoryMap = getIndexCategoryMap(categoriesResult);

      // Shared predicate — same function used by the UI continuity tab
      const categorizedItems = filterPipelinesByCategories(payload.items, categoriesResult);

      const enrichedFindings = (payload.actionableFindings ?? [])
        .filter((finding) => categorizedItems.some((p) => p.name === finding.resource))
        .map((finding) => {
          const pipeline = categorizedItems.find((p) => p.name === finding.resource);
          const category = pipeline?.indices
            .map((idx) => indexToCategoryMap.get(idx))
            .find(Boolean) as MainCategories | undefined;
          return category ? { ...finding, category } : finding;
        });

      const failingCount = categorizedItems.filter(
        (p) => p.statsAvailable && isCriticalFailureRate(p.failedDocsCount, p.docsCount)
      ).length;
      const filteredStatus =
        categorizedItems.length === 0
          ? ('noData' as const)
          : failingCount > 0
          ? ('actionsRequired' as const)
          : ('healthy' as const);
      const filteredSummary =
        filteredStatus === 'noData'
          ? 'No ingest pipeline statistics available for categorized indices.'
          : failingCount > 0
          ? `${failingCount} of ${categorizedItems.length} active pipelines have critical failure rates.`
          : `All ${categorizedItems.length} active ingest pipelines are functioning properly, with no document failures.`;

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              ...payload,
              status: filteredStatus,
              summary: filteredSummary,
              items: categorizedItems,
              actionableFindings: enrichedFindings,
            },
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
