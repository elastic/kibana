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
import { getIndexCategoryMap, isQualityIncompatible, enrichFindings } from '@kbn/siem-readiness';
import {
  fetchRuleFieldCaps,
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

      // Phase 2: dimension-specific data (quality check results)
      const payload = await getQuality({
        esClient: esClient.asCurrentUser,
        logger: handlerLogger,
      });

      // Phase 2.5: rule required-field coverage check
      // Identifies rules whose required_fields are not fully mapped in the indices they query —
      // fully unmapped fields cause silent non-matching; partially unmapped fields cause partial matching.
      const { ruleRequiredFields, indexToRules, errors } = reverseMapResult;
      const missingFieldsByRule = await fetchRuleFieldCaps({
        esClient: esClient.asCurrentUser,
        indexToRules,
        ruleRequiredFields,
      });

      const missingFieldFindings = missingFieldsByRule.flatMap((entry) =>
        entry.fields.map((fieldDetail) => {
          const message =
            fieldDetail.status === 'partial'
              ? `Rule "${entry.ruleName}" declares required field "${
                  fieldDetail.name
                }" which is unmapped in some queried indices (${(fieldDetail.unmappedIn ?? []).join(
                  ', '
                )}) - the rule may match only partially`
              : `Rule "${entry.ruleName}" declares required field "${fieldDetail.name}" which is not mapped in any of its queried indices - the rule may fail to match events it is meant to detect`;

          return {
            severity: 'WARNING' as const,
            type: 'missing_field' as const,
            message,
            resource: fieldDetail.name,
          };
        })
      );

      // Phase 3: blast radius enrichment — ECS quality findings only.
      // missing_field findings already name the affected rule directly in the message;
      // blast radius is circular and always empty for field-name resources.
      const enrichedEcsFindings = enrichFindings(payload.actionableFindings ?? [], {
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

      const incompatibleCount = categorizedItems.filter((item) =>
        isQualityIncompatible(item.incompatibleFieldCount)
      ).length;
      const missingFieldCount = missingFieldsByRule.length;
      const filteredStatus =
        categorizedItems.length === 0 && missingFieldCount === 0
          ? ('noData' as const)
          : incompatibleCount > 0 || missingFieldCount > 0
          ? ('actionsRequired' as const)
          : ('healthy' as const);

      const parts: string[] = [];
      if (incompatibleCount > 0)
        parts.push(
          `${incompatibleCount} of ${categorizedItems.length} indices have incompatible ECS field mappings`
        );
      if (missingFieldCount > 0)
        parts.push(
          `${missingFieldCount} rule(s) have required fields not fully mapped in their queried indices`
        );
      if (errors.rulesPartial)
        parts.push(
          'index resolution failed for some rules — the required-field coverage list may be incomplete'
        );
      const baseNoDataSummary =
        'No quality check results available. Run the Data Quality dashboard to see results.';
      const filteredSummary =
        filteredStatus === 'noData'
          ? errors.rulesPartial
            ? `${baseNoDataSummary} Note: index resolution failed for some rules — the required-field coverage list may be incomplete.`
            : baseNoDataSummary
          : parts.length > 0
          ? `${parts.join('; ')}.`
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
