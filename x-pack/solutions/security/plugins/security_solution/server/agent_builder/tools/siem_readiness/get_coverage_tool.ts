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
import { enrichFindings } from '@kbn/siem-readiness';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { getCoverage } from '../../../lib/siem_readiness/dimensions';
import {
  getSiemReadinessSharedContext,
  fetchSiemReadinessSharedContext,
} from '../../../lib/siem_readiness/fetchers';
import { SIEM_READINESS_COVERAGE_TOOL_ID } from './tool_ids';

const schema = z.object({});

export const getCoverageTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof schema> => ({
  id: SIEM_READINESS_COVERAGE_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Retrieves SIEM data coverage health. Returns ingested data organized by the five main SIEM categories (Endpoint, Identity, Network, Cloud, Application/SaaS) with document counts per index. Also checks whether enabled detection rules are present. Includes an overall health status (healthy / actionsRequired / noData) and actionable findings for categories with missing data. Each actionable finding includes blast radius data. When presenting any finding, always show these as explicit labeled fields: Affected Platform, Affected Rules, Affected Tactics.',
  schema,
  tags: ['security', 'siem-readiness', 'coverage'],
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

      // Derive from the reverse map — avoids a savedObjectsClient query that lacks
      // access to alert objects in the Agent Builder context.
      // A rule is "present" if it resolved to any index, contributed to tactic totals, or is an ML rule.
      const hasDetectionRules =
        reverseMapResult.indexToRules.size > 0 ||
        reverseMapResult.tacticTotals.size > 0 ||
        reverseMapResult.mlRules.length > 0;

      // Phase 2: dimension-specific data
      const payload = await getCoverage({
        logger: handlerLogger,
        categoriesData: categoriesResult,
        hasDetectionRules,
      });

      // Phase 3: blast radius enrichment
      const enrichedFindings = enrichFindings(payload.actionableFindings ?? [], {
        ...reverseMapResult,
        indexToPlatform,
        dimension: 'coverage',
      });

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: { ...payload, actionableFindings: enrichedFindings },
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
            data: { message: `Error fetching SIEM coverage: ${e.message ?? 'unknown error'}` },
          },
        ],
      };
    }
  },
});
