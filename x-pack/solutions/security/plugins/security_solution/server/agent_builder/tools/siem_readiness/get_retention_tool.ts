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
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { getRetention } from '../../../lib/siem_readiness/dimensions';
import { fetchCategories } from '../../../lib/siem_readiness/fetchers';
import { SIEM_READINESS_RETENTION_TOOL_ID } from './tool_ids';

const schema = z.object({});

export const getRetentionTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  isServerless: boolean
): BuiltinToolDefinition<typeof schema> => ({
  id: SIEM_READINESS_RETENTION_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Retrieves SIEM data retention health. Returns data streams and standalone indices with their retention configuration (ILM policy or DSL), retention period in days, and compliance status against the 365-day FedRAMP threshold — filtered to categorized SIEM indices. Includes an overall health status (healthy / actionsRequired / noData) and actionable findings for non-compliant indices.',
  schema,
  tags: ['security', 'siem-readiness', 'retention'],
  availability: {
    cacheMode: 'space',
    handler: async ({ request }) => {
      return getAgentBuilderResourceAvailability({ core, request, logger });
    },
  },
  handler: async (_params, { esClient, logger: handlerLogger }) => {
    try {
      const [payload, categoriesResult] = await Promise.all([
        getRetention({ esClient: esClient.asCurrentUser, isServerless, logger: handlerLogger }),
        fetchCategories({ esClient: esClient.asCurrentUser, logger: handlerLogger }),
      ]);

      // Retention items carry data stream names; category indices carry backing index names.
      // A data stream name is a substring of its backing index names, so use contains-match.
      const getCategoryForItem = (indexName: string): MainCategories | undefined => {
        for (const group of categoriesResult.mainCategoriesMap ?? []) {
          if (group.indices.some((idx) => idx.indexName.includes(indexName))) {
            return group.category as MainCategories;
          }
        }
        return undefined;
      };

      const categorizedItems = payload.items.filter((item) =>
        categoriesResult.mainCategoriesMap?.some((group) =>
          group.indices.some((idx) => idx.indexName.includes(item.indexName))
        )
      );

      const enrichedFindings = (payload.actionableFindings ?? []).map((finding) => {
        const category = getCategoryForItem(finding.resource);
        return category ? { ...finding, category } : finding;
      });

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: { ...payload, items: categorizedItems, actionableFindings: enrichedFindings },
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
            data: { message: `Error fetching SIEM retention: ${e.message ?? 'unknown error'}` },
          },
        ],
      };
    }
  },
});
