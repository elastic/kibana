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
  isRetentionNonCompliant,
  filterRetentionItemsByCategories,
  enrichFindings,
} from '@kbn/siem-readiness';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { getRetention } from '../../../lib/siem_readiness/dimensions';
import {
  getSiemReadinessSharedContext,
  fetchSiemReadinessSharedContext,
} from '../../../lib/siem_readiness/fetchers';
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
    'Retrieves SIEM data retention health. Returns data streams and standalone indices with their retention configuration (ILM policy or DSL), retention period in days, and compliance status against the 365-day FedRAMP threshold — filtered to categorized SIEM indices. Includes an overall health status (healthy / actionsRequired / noData) and actionable findings for non-compliant indices. Each actionable finding includes blast radius data. When presenting any finding, always show these as explicit labeled fields: Affected Platform, Affected Rules, Affected Tactics.',
  schema,
  tags: ['security', 'siem-readiness', 'retention'],
  availability: {
    cacheMode: 'space',
    handler: async ({ request }) => {
      return getAgentBuilderResourceAvailability({ core, request, logger });
    },
  },
  handler: async (_params, { esClient, logger: handlerLogger, request }) => {
    try {
      const [coreStart, startPlugins] = await core.getStartServices();

      // Phase 1: shared context (rules reverse map + categories) — lazy per-request
      const { reverseMapResult, categoriesResult, indexToPlatform } =
        await getSiemReadinessSharedContext(request, async () => {
          const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);
          const dataViewsService = await startPlugins.dataViews.dataViewsServiceFactory(
            coreStart.savedObjects.getScopedClient(request),
            esClient.asCurrentUser
          );
          return fetchSiemReadinessSharedContext({
            rulesClient,
            esClient: esClient.asCurrentUser,
            dataViewsService,
            logger: handlerLogger,
          });
        });

      // Phase 2: dimension-specific data (ILM/DSL retention)
      const payload = await getRetention({
        esClient: esClient.asCurrentUser,
        isServerless,
        logger: handlerLogger,
      });

      // Phase 3: blast radius enrichment
      const allEnrichedFindings = enrichFindings(payload.actionableFindings ?? [], {
        ...reverseMapResult,
        indexToPlatform,
        dimension: 'retention',
      });

      // Shared predicate — same function used by the UI retention tab
      const categorizedItems = filterRetentionItemsByCategories(payload.items, categoriesResult);

      // Build the category lookup once from the already-filtered items so findings enrichment
      // stays in sync with the filter predicate — no separate closure needed.
      const resourceToCategoryMap = new Map<string, MainCategories>();
      for (const group of categoriesResult.mainCategoriesMap ?? []) {
        for (const item of categorizedItems) {
          if (group.indices.some((idx) => idx.indexName.includes(item.indexName))) {
            resourceToCategoryMap.set(item.indexName, group.category as MainCategories);
          }
        }
      }

      const enrichedFindings = allEnrichedFindings
        .filter((finding) => resourceToCategoryMap.has(finding.resource))
        .map((finding) => {
          const category = resourceToCategoryMap.get(finding.resource);
          return category !== undefined ? { ...finding, category } : finding;
        });

      const nonCompliantCount = categorizedItems.filter((item) =>
        isRetentionNonCompliant(item.status)
      ).length;
      const filteredStatus =
        categorizedItems.length === 0
          ? ('noData' as const)
          : nonCompliantCount > 0
          ? ('actionsRequired' as const)
          : ('healthy' as const);
      const filteredSummary =
        filteredStatus === 'noData'
          ? 'No retention data available for categorized indices.'
          : nonCompliantCount > 0
          ? `${nonCompliantCount} of ${categorizedItems.length} data streams or indices have retention below the 365-day threshold.`
          : `All ${categorizedItems.length} data streams and indices meet the 365-day retention requirement.`;

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
      handlerLogger.error(`[get_retention_tool] Error: ${e.message ?? 'unknown error'}`);
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
