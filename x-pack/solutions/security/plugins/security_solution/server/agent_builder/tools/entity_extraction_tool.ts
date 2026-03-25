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
import { extractEntitiesFromAlerts } from '@kbn/elastic-assistant-plugin/server';
import { securityTool } from './constants';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';

const entityExtractionSchema = z.object({
  alert_ids: z
    .array(z.string())
    .describe('Array of alert IDs to extract entities from.'),
  index: z
    .string()
    .optional()
    .describe('Alerts index to fetch from. Defaults to .alerts-security.alerts-<spaceId>'),
});

export const ENTITY_EXTRACTION_TOOL_ID = securityTool('entity_extraction');

export const entityExtractionTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof entityExtractionSchema> => ({
  id: ENTITY_EXTRACTION_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Extract observable entities (hosts, users, IPs, domains, processes, files, hashes) ' +
    'from security alerts. Identifies IOCs and key observables for investigation. ' +
    'Use when an analyst asks "what entities are in this alert?", "extract IOCs", ' +
    'or "what hosts/users/IPs are involved?".',
  schema: entityExtractionSchema,
  availability: {
    cacheMode: 'space',
    handler: async ({ request }) =>
      getAgentBuilderResourceAvailability({ core, request, logger }),
  },
  handler: async ({ alert_ids: alertIds, index }, { esClient, spaceId }) => {
    const alertsIndex = index ?? `.alerts-security.alerts-${spaceId}`;

    logger.debug(`entity_extraction tool called with ${alertIds.length} alerts`);

    // Fetch alerts from ES
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

    // Use the shared entity extraction from elastic_assistant
    const result = extractEntitiesFromAlerts({
      alerts,
      logger,
    });

    // Group entities by type for summary
    const entitiesByType = new Map<string, Set<string>>();
    for (const entity of result.entities) {
      if (!entitiesByType.has(entity.typeKey)) {
        entitiesByType.set(entity.typeKey, new Set());
      }
      entitiesByType.get(entity.typeKey)!.add(entity.value);
    }

    const entitySummary = [...entitiesByType.entries()].map(([type, values]) => ({
      type,
      count: values.size,
      values: [...values].slice(0, 20),
    }));

    return {
      entities: result.entities,
      entities_by_type: entitySummary,
      stats: result.stats,
      total_alerts_processed: alerts.length,
      summary: `Extracted ${result.stats.entitiesAfterDedup} unique entities across ${entitySummary.length} types from ${alerts.length} alerts.`,
    };
  },
  tags: ['security', 'alerts', 'entities', 'ioc'],
});
