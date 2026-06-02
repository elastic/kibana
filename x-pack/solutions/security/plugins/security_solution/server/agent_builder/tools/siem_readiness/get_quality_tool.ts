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
import { getIndexCategoryMap, isQualityIncompatible } from '@kbn/siem-readiness';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { getQuality } from '../../../lib/siem_readiness/dimensions';
import { fetchCategories } from '../../../lib/siem_readiness/fetchers';
import { SIEM_READINESS_QUALITY_TOOL_ID } from './tool_ids';

const schema = z.object({});

export const getQualityTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof schema> => ({
  id: SIEM_READINESS_QUALITY_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Retrieves SIEM data quality health based on ECS (Elastic Common Schema) compatibility check results. Returns indices with incompatible field mappings including field-level details — filtered to categorized SIEM indices. Includes an overall health status (healthy / actionsRequired / noData) and actionable findings. Note: results are only available after running a data quality check from the Security > Data Quality dashboard.',
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
      const [payload, categoriesResult] = await Promise.all([
        getQuality({ esClient: esClient.asCurrentUser, logger: handlerLogger }),
        fetchCategories({ esClient: esClient.asCurrentUser, logger: handlerLogger }),
      ]);

      const indexToCategoryMap = getIndexCategoryMap(categoriesResult);

      const categorizedItems = payload.items.filter((result) =>
        indexToCategoryMap.has(result.indexName)
      );

      const enrichedFindings = (payload.actionableFindings ?? [])
        .filter((finding) => indexToCategoryMap.has(finding.resource))
        .map((finding) => {
          const category = indexToCategoryMap.get(finding.resource) as MainCategories | undefined;
          return category ? { ...finding, category } : finding;
        });

      const incompatibleCount = categorizedItems.filter((item) =>
        isQualityIncompatible(item.incompatibleFieldCount)
      ).length;
      const filteredStatus =
        categorizedItems.length === 0
          ? ('noData' as const)
          : incompatibleCount > 0
          ? ('actionsRequired' as const)
          : ('healthy' as const);
      const filteredSummary =
        filteredStatus === 'noData'
          ? 'No quality check results available for categorized indices.'
          : incompatibleCount > 0
          ? `${incompatibleCount} of ${categorizedItems.length} indices have incompatible ECS field mappings.`
          : `All ${categorizedItems.length} checked indices have compatible ECS field mappings.`;

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
            data: { message: `Error fetching SIEM quality: ${e.message ?? 'unknown error'}` },
          },
        ],
      };
    }
  },
});
