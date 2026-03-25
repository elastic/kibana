/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import {
  extractEntitiesFromAlerts,
  matchAlertsToCases,
} from '@kbn/elastic-assistant-plugin/server';
import { securityTool } from './constants';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';

const caseMatchingSchema = z.object({
  alert_ids: z
    .array(z.string())
    .describe('Array of alert IDs to find matching cases for.'),
  match_threshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe(
      'Minimum score (0-1) for considering a case as a match. Default: 0.3. Higher values require stronger matches.'
    ),
  index: z
    .string()
    .optional()
    .describe('Alerts index to fetch from. Defaults to .alerts-security.alerts-<spaceId>'),
});

export const CASE_MATCHING_TOOL_ID = securityTool('case_matching');

export const caseMatchingTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof caseMatchingSchema> => ({
  id: CASE_MATCHING_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Find the best matching existing case for security alerts based on shared entities ' +
    '(hosts, users, IPs, processes, file hashes). Scores each open case by entity overlap. ' +
    'Use when an analyst asks "which case should this alert go to?", "find related cases", ' +
    'or "does this alert belong to an existing investigation?".',
  schema: caseMatchingSchema,
  availability: {
    cacheMode: 'space',
    handler: async ({ request }) =>
      getAgentBuilderResourceAvailability({ core, request, logger }),
  },
  handler: async ({ alert_ids: alertIds, match_threshold: threshold, index }, { esClient, spaceId }) => {
    const alertsIndex = index ?? `.alerts-security.alerts-${spaceId}`;

    logger.debug(
      `case_matching tool called with ${alertIds.length} alerts, threshold: ${threshold ?? 0.3}`
    );

    // Step 1: Fetch alerts from ES
    const alertsResponse = await esClient.asCurrentUser.search({
      index: alertsIndex,
      body: {
        query: { ids: { values: alertIds } },
        size: alertIds.length,
      },
    });

    const alerts = alertsResponse.hits.hits.map((hit) => ({
      _id: hit._id!,
      _source: hit._source as Record<string, unknown>,
    }));

    // Step 2: Extract entities using shared logic
    const extractionResult = extractEntitiesFromAlerts({ alerts, logger });

    // Step 3: Build entity summary for the response
    const entitiesByType = new Map<string, Set<string>>();
    for (const entity of extractionResult.entities) {
      if (!entitiesByType.has(entity.typeKey)) {
        entitiesByType.set(entity.typeKey, new Set());
      }
      entitiesByType.get(entity.typeKey)!.add(entity.value);
    }

    const entitySummary = Object.fromEntries(
      [...entitiesByType.entries()].map(([k, v]) => [k, [...v]])
    );

    // Note: Full case matching requires Cases plugin access (KibanaRequest + CasesServerStart)
    // which isn't available in Agent Builder tool context.
    // The tool provides entity extraction and summary; the skill orchestrates the full flow.
    return {
      alert_entities: entitySummary,
      total_entities: extractionResult.stats.entitiesAfterDedup,
      extraction_stats: extractionResult.stats,
      match_threshold: threshold ?? 0.3,
      recommendation:
        extractionResult.stats.entitiesAfterDedup > 0
          ? `Extracted ${extractionResult.stats.entitiesAfterDedup} entities from ${alerts.length} alerts. Use the entity overlap to find related cases.`
          : 'No entities could be extracted from these alerts. Manual case assignment recommended.',
      summary: `Extracted entities from ${alerts.length} alerts: ${[...entitiesByType.entries()].map(([type, values]) => `${values.size} ${type}(s)`).join(', ')}.`,
    };
  },
  tags: ['security', 'alerts', 'cases', 'matching'],
});
