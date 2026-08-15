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
import type { MainCategories, PlatformFindingInput } from '@kbn/siem-readiness';
import {
  buildPlatformReadiness,
  enrichFindings,
  filterPipelinesByCategories,
  filterRetentionItemsByCategories,
  getIndexCategoryMap,
} from '@kbn/siem-readiness';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import {
  getContinuity,
  getCoverage,
  getQuality,
  getRetention,
} from '../../../lib/siem_readiness/dimensions';
import {
  fetchSiemReadinessSharedContext,
  getSiemReadinessSharedContext,
} from '../../../lib/siem_readiness/fetchers';
import { SIEM_READINESS_PLATFORM_TOOL_ID } from './tool_ids';

const schema = z.object({
  platform: z.string().max(200).optional(),
});

export const getPlatformReadinessTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  isServerless: boolean
): BuiltinToolDefinition<typeof schema> => ({
  id: SIEM_READINESS_PLATFORM_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Retrieves SIEM readiness rolled up by platform label derived from ECS fields in the actual data (e.g. "AWS account 123456789012", "windows Endpoints", "okta"). Returns per-platform active stream counts, enabled rule counts, MITRE tactic counts, status, top finding, and nested actionable findings across coverage, quality, continuity, and retention. Pass an optional platform filter for questions like "How is AWS account 123456789012 readiness?" or omit it to compare all discovered platforms. When presenting platform findings, always show Affected Platform, Affected Rules, and Affected Tactics for each nested finding.',
  schema,
  tags: ['security', 'siem-readiness', 'platform'],
  availability: {
    cacheMode: 'space',
    handler: async ({ request }) => {
      return getAgentBuilderResourceAvailability({ core, request, logger });
    },
  },
  handler: async (params, { esClient, logger: handlerLogger, request }) => {
    try {
      const [coreStart, startPlugins] = await core.getStartServices();

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

      const hasDetectionRules =
        reverseMapResult.indexToRules.size > 0 ||
        reverseMapResult.tacticTotals.size > 0 ||
        reverseMapResult.mlRules.length > 0;

      const [coveragePayload, qualityPayload, continuityPayload, retentionPayload] =
        await Promise.all([
          getCoverage({
            logger: handlerLogger,
            categoriesData: categoriesResult,
            hasDetectionRules,
          }),
          getQuality({
            esClient: esClient.asCurrentUser,
            logger: handlerLogger,
          }),
          getContinuity({
            esClient: esClient.asCurrentUser,
            isServerless,
            logger: handlerLogger,
            categoriesData: categoriesResult,
          }),
          getRetention({
            esClient: esClient.asCurrentUser,
            isServerless,
            logger: handlerLogger,
          }),
        ]);

      const indexToCategoryMap = getIndexCategoryMap(categoriesResult);
      const categorizedPipelines = filterPipelinesByCategories(
        continuityPayload.items,
        categoriesResult
      );
      const categorizedRetentionItems = filterRetentionItemsByCategories(
        retentionPayload.items,
        categoriesResult
      );

      const resourceToRetentionCategory = new Map<string, MainCategories>();
      for (const group of categoriesResult.mainCategoriesMap ?? []) {
        for (const item of categorizedRetentionItems) {
          if (group.indices.some((idx) => idx.indexName.includes(item.indexName))) {
            resourceToRetentionCategory.set(item.indexName, group.category as MainCategories);
          }
        }
      }

      const coverageFindings = enrichFindings(coveragePayload.actionableFindings ?? [], {
        ...reverseMapResult,
        indexToPlatform,
        dimension: 'coverage',
      });

      const qualityFindings = enrichFindings(qualityPayload.actionableFindings ?? [], {
        ...reverseMapResult,
        indexToPlatform,
        dimension: 'quality',
      })
        .filter((finding) => indexToCategoryMap.has(finding.resource))
        .map((finding) => {
          const category = indexToCategoryMap.get(finding.resource) as MainCategories | undefined;
          return category ? { ...finding, category } : finding;
        });

      const continuityFindings = enrichFindings(continuityPayload.actionableFindings ?? [], {
        ...reverseMapResult,
        indexToPlatform,
        dimension: 'continuity',
      })
        .filter((finding) =>
          categorizedPipelines.some((pipeline) => pipeline.name === finding.resource)
        )
        .map((finding) => {
          const pipeline = categorizedPipelines.find((item) => item.name === finding.resource);
          const category = pipeline?.indices
            .map((idx) => indexToCategoryMap.get(idx))
            .find(Boolean) as MainCategories | undefined;
          return category ? { ...finding, category } : finding;
        });

      const retentionFindings = enrichFindings(retentionPayload.actionableFindings ?? [], {
        ...reverseMapResult,
        indexToPlatform,
        dimension: 'retention',
      })
        .filter((finding) => resourceToRetentionCategory.has(finding.resource))
        .map((finding) => {
          const category = resourceToRetentionCategory.get(finding.resource);
          return category !== undefined ? { ...finding, category } : finding;
        });

      const findings: PlatformFindingInput[] = [
        ...coverageFindings.map((finding) => ({ dimension: 'coverage' as const, finding })),
        ...qualityFindings.map((finding) => ({ dimension: 'quality' as const, finding })),
        ...continuityFindings.map((finding) => ({ dimension: 'continuity' as const, finding })),
        ...retentionFindings.map((finding) => ({ dimension: 'retention' as const, finding })),
      ];

      const payload = buildPlatformReadiness({
        indexToPlatform,
        indexToRules: reverseMapResult.indexToRules,
        pipelineToIndices: reverseMapResult.pipelineToIndices,
        categoryToIndices: reverseMapResult.categoryToIndices,
        categoriesResult,
        findings,
        platformFilter: params.platform,
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
            data: {
              message: `Error fetching SIEM platform readiness: ${e.message ?? 'unknown error'}`,
            },
          },
        ],
      };
    }
  },
});
