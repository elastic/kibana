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
  getIndexCategoriesMap,
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
    'Retrieves SIEM data retention health. Returns data streams and standalone indices with their retention configuration (ILM policy or DSL), retention period in days, and compliance status against the 365-day FedRAMP threshold — filtered to categorized SIEM indices. Includes an overall health status (healthy / actionsRequired / noData) and actionable findings for non-compliant indices. Each actionable finding includes blast radius data and a `categories` array (filter by this field for category/tab questions). When presenting any finding, always show these as explicit labeled fields: Affected Platform, Affected Rules, Affected Tactics.',
  schema,
  tags: ['security', 'siem-readiness', 'retention'],
  annotations: {
    title: 'Get SIEM Retention',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
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
      const indexToCategoriesMap = getIndexCategoriesMap(categoriesResult);

      // Retention items are data-stream names; categories map keys are often backing indices.
      // Resolve categories by contains-match (same strategy as filterRetentionItemsByCategories).
      const resolveCategories = (indexName: string): MainCategories[] => {
        const direct = indexToCategoriesMap.get(indexName);
        if (direct?.length) return direct;

        const matched = new Set<MainCategories>();
        for (const [mapIndex, cats] of indexToCategoriesMap) {
          if (mapIndex.includes(indexName)) {
            cats.forEach((c) => matched.add(c));
          }
        }
        return Array.from(matched);
      };

      // Populate categories on items using the same resolver as findings, so item grouping
      // (UI retention tab + agent attachment) and finding grouping agree — mirroring how
      // fetchPipelines writes pipeline.categories server-side for continuity.
      const categorizedItemsWithCategories = categorizedItems.map((item) => {
        const categories = resolveCategories(item.indexName);
        return categories.length > 0 ? { ...item, categories } : item;
      });

      const enrichedFindings = allEnrichedFindings
        .filter((finding) => categorizedItems.some((item) => item.indexName === finding.resource))
        .map((finding) => {
          const categories = resolveCategories(finding.resource);
          return categories.length > 0 ? { ...finding, categories } : finding;
        });

      const nonCompliantCount = categorizedItemsWithCategories.filter((item) =>
        isRetentionNonCompliant(item.status)
      ).length;
      const filteredStatus =
        categorizedItemsWithCategories.length === 0
          ? ('noData' as const)
          : nonCompliantCount > 0
          ? ('actionsRequired' as const)
          : ('healthy' as const);
      const filteredSummary =
        filteredStatus === 'noData'
          ? 'No retention data available for categorized indices.'
          : nonCompliantCount > 0
          ? `${nonCompliantCount} of ${categorizedItemsWithCategories.length} data streams or indices have retention below the 365-day threshold.`
          : `All ${categorizedItemsWithCategories.length} data streams and indices meet the 365-day retention requirement.`;

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              ...payload,
              status: filteredStatus,
              summary: filteredSummary,
              items: categorizedItemsWithCategories,
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
