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
  getQualityVerdict,
  isQualityIncompatible,
  enrichFindings,
} from '@kbn/siem-readiness';
import {
  getSiemReadinessSharedContext,
  fetchSiemReadinessSharedContext,
} from '../../../lib/siem_readiness/fetchers';
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
    'Retrieves SIEM data quality health across two signals: (1) ECS field compatibility check results from the Data Quality dashboard — indices with incompatible field mappings; (2) rule required-field coverage — detection rules whose declared required_fields are not fully mapped in the indices they query (required_fields is an informational property, so unmapped fields are a strong signal the rule under-matches, not a guaranteed failure: fully unmapped fields may cause silent under-matching; partially unmapped fields may cause partial matching). Returns an overall health status (healthy / actionsRequired / noData), actionable findings, and a missingFieldsByRule array listing each affected rule and its unmapped or partially-mapped fields. Each finding includes blast radius data. When presenting findings, always show Affected Platform, Affected Rules, and Affected Tactics as explicit labeled fields.',
  schema,
  tags: ['security', 'siem-readiness', 'quality'],
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

      // Phase 2: dimension-specific data. getQuality is the shared orchestrator: it computes both
      // ECS field compatibility AND rule required-field coverage (missingFieldsByRule + findings),
      // so the agent tool and any future HTTP route return identical results.
      const payload = await getQuality({
        esClient: esClient.asCurrentUser,
        logger: handlerLogger,
        reverseMapResult,
      });

      const { errors } = reverseMapResult;
      const { missingFieldsByRule } = payload;

      // Phase 3: blast radius enrichment — ECS quality findings only.
      // missing_field findings already name the affected rule directly in the message;
      // blast radius is circular and always empty for field-name resources, so pass them through.
      const payloadFindings = payload.actionableFindings ?? [];
      const ecsFindings = payloadFindings.filter((finding) => finding.type !== 'missing_field');
      const missingFieldFindings = payloadFindings.filter(
        (finding) => finding.type === 'missing_field'
      );

      const enrichedEcsFindings = enrichFindings(ecsFindings, {
        ...reverseMapResult,
        indexToPlatform,
        dimension: 'quality',
      });

      const allEnrichedFindings = [...enrichedEcsFindings, ...missingFieldFindings];

      const indexToCategoryMap = getIndexCategoryMap(categoriesResult);

      const categorizedItems = payload.items.filter((result) =>
        indexToCategoryMap.has(result.indexName)
      );

      // ECS findings are keyed by index name — filter to categorized indices and attach category.
      // Missing-field findings are keyed by field name (not index) — pass through without filtering.
      const enrichedFindings = allEnrichedFindings
        .map((finding) => {
          if (finding.type === 'missing_field') return finding;
          const category = indexToCategoryMap.get(finding.resource) as MainCategories | undefined;
          return category ? { ...finding, category } : finding;
        })
        .filter(
          (finding) => finding.type === 'missing_field' || indexToCategoryMap.has(finding.resource)
        );

      // Status/summary are derived from the category-filtered counts via the shared verdict helper,
      // so the tool phrases its conclusion identically to the getQuality orchestrator (which uses
      // the same helper on the unfiltered counts).
      const incompatibleCount = categorizedItems.filter((item) =>
        isQualityIncompatible(item.incompatibleFieldCount)
      ).length;
      const { status: filteredStatus, summary: filteredSummary } = getQualityVerdict({
        checkedCount: categorizedItems.length,
        incompatibleCount,
        missingFieldCount: missingFieldsByRule.length,
        rulesPartial: errors.rulesPartial,
      });

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
              missingFieldsByRule,
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
