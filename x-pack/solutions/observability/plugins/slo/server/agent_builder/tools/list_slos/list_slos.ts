/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { createOtherResult } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { SLO_AGENT_TOOL_IDS } from '@kbn/slo-schema';
import { z } from '@kbn/zod/v4';
import { FindSLO } from '../../../services/find_slo';
import { DefaultSummarySearchClient } from '../../../services/summary_search_client/summary_search_client';
import type { SloToolDeps } from '../../common/deps';
import { toToolErrorResult } from '../../common/errors';
import { assertPlatinumLicenseForTools } from '../../common/license';

const listSlosSchema = z.object({
  kqlQuery: z
    .string()
    .optional()
    .describe(
      'KQL query to filter SLOs by their summary fields (e.g. slo.name, slo.tags, status). Combined with sloIds when both are provided.'
    ),
  sloIds: z
    .array(z.string())
    .max(100)
    .optional()
    .describe('List of specific SLO IDs to retrieve (OR-ed). ANDed with kqlQuery when provided.'),
  page: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Page number for offset pagination (default: 1).'),
  perPage: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Number of results per page (default: 25, max: 100).'),
  sortBy: z
    .enum([
      'error_budget_consumed',
      'error_budget_remaining',
      'sli_value',
      'status',
      'burn_rate_5m',
      'burn_rate_1h',
      'burn_rate_1d',
    ])
    .optional()
    .describe('Field to sort by.'),
  sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction.'),
  hideStale: z
    .boolean()
    .optional()
    .describe('When true, hides SLOs whose summary data may be stale.'),
});

function composeKql(kqlQuery?: string, sloIds?: string[]): string {
  const parts: string[] = [];
  if (sloIds && sloIds.length > 0) {
    const quotedIds = sloIds.map((id) => `"${id}"`).join(' OR ');
    parts.push(`slo.id:(${quotedIds})`);
  }
  if (kqlQuery) {
    parts.push(kqlQuery);
  }
  return parts.join(' AND ');
}

export const listSlosTool = (
  deps: SloToolDeps
): BuiltinSkillBoundedTool<typeof listSlosSchema> => ({
  id: SLO_AGENT_TOOL_IDS.listSlos,
  type: ToolType.builtin,
  description:
    'List and search SLOs with their current status and error budget. Use for discovering which SLOs exist, filtering by name/tags/status, looking up specific SLOs by ID, and identifying breaching SLOs.',
  schema: listSlosSchema,
  handler: async (params, { request, logger }) => {
    try {
      await assertPlatinumLicenseForTools(deps.getLicensing);

      const { page = 1, perPage = 25, kqlQuery, sloIds, sortBy, sortDirection, hideStale } = params;

      const composedKql = composeKql(kqlQuery, sloIds);

      const { scopedClusterClient, repository, spaceId, settingsRepository } =
        await deps.getScopedClients({ request, logger });

      const settings = await settingsRepository.get();
      const summarySearchClient = new DefaultSummarySearchClient(
        scopedClusterClient,
        logger,
        spaceId,
        settings
      );
      const findSLO = new FindSLO(repository, summarySearchClient);

      const {
        total,
        page: resultPage,
        perPage: resultPerPage,
        results,
      } = await findSLO.execute({
        kqlQuery: composedKql,
        page: String(page),
        perPage: String(perPage),
        ...(sortBy !== undefined && { sortBy }),
        ...(sortDirection !== undefined && { sortDirection }),
        ...(hideStale !== undefined && { hideStale }),
      });

      const trimmed = results.map((result) => ({
        id: result.id,
        name: result.name,
        status: result.summary.status,
        sliValue: result.summary.sliValue,
        errorBudget: result.summary.errorBudget,
        objective: result.objective,
        timeWindow: result.timeWindow,
        indicatorType: result.indicator.type,
        groupBy: result.groupBy,
        instanceId: result.instanceId,
        groupings: result.groupings,
        tags: result.tags,
      }));

      return { results: [createOtherResult({ total, page: resultPage, perPage: resultPerPage, results: trimmed })] };
    } catch (error) {
      return toToolErrorResult({ error, metadata: { params }, logger });
    }
  },
});
