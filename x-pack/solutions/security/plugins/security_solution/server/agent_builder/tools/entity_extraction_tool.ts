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
    .describe(
      'Alerts index to fetch from. Defaults to .alerts-security.alerts-<spaceId>'
    ),
});

export const ENTITY_EXTRACTION_TOOL_ID = securityTool('entity_extraction');

/** ECS field paths mapped to entity types */
const ECS_ENTITY_MAPPINGS: Array<{ path: string; type: string; label: string }> = [
  { path: 'host.name', type: 'hostname', label: 'Host' },
  { path: 'host.ip', type: 'ip', label: 'Host IP' },
  { path: 'user.name', type: 'user', label: 'User' },
  { path: 'user.email', type: 'email', label: 'Email' },
  { path: 'source.ip', type: 'ip', label: 'Source IP' },
  { path: 'destination.ip', type: 'ip', label: 'Destination IP' },
  { path: 'source.domain', type: 'domain', label: 'Source Domain' },
  { path: 'destination.domain', type: 'domain', label: 'Destination Domain' },
  { path: 'url.full', type: 'url', label: 'URL' },
  { path: 'process.name', type: 'process', label: 'Process' },
  { path: 'process.executable', type: 'process', label: 'Process Executable' },
  { path: 'process.hash.sha256', type: 'fileHash', label: 'Process Hash' },
  { path: 'file.name', type: 'file', label: 'File' },
  { path: 'file.path', type: 'file', label: 'File Path' },
  { path: 'file.hash.sha256', type: 'fileHash', label: 'File Hash' },
  { path: 'file.hash.md5', type: 'fileHash', label: 'File Hash (MD5)' },
  { path: 'dns.question.name', type: 'domain', label: 'DNS Query' },
  { path: 'registry.path', type: 'registry', label: 'Registry Path' },
  { path: 'threat.indicator.ip', type: 'ip', label: 'Threat IP' },
  { path: 'threat.indicator.domain', type: 'domain', label: 'Threat Domain' },
];

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

    // Fetch alerts with all entity-relevant fields
    const sourceFields = ECS_ENTITY_MAPPINGS.map((m) => m.path);
    sourceFields.push('kibana.alert.rule.name', 'kibana.alert.severity');

    const alertsResponse = await esClient.asCurrentUser.search({
      index: alertsIndex,
      body: {
        query: { ids: { values: alertIds } },
        size: alertIds.length,
        _source: sourceFields,
      },
    });

    // Extract entities from each alert
    const entitiesByType = new Map<string, Set<string>>();
    const entitiesPerAlert: Array<{
      alert_id: string;
      entities: Array<{ type: string; value: string; field: string }>;
    }> = [];

    for (const hit of alertsResponse.hits.hits) {
      const source = hit._source as Record<string, unknown>;
      const alertEntities: Array<{ type: string; value: string; field: string }> = [];

      for (const mapping of ECS_ENTITY_MAPPINGS) {
        const value = getNestedValue(source, mapping.path);
        if (value == null) continue;

        const values = Array.isArray(value) ? value : [value];
        for (const v of values) {
          const strVal = String(v).trim();
          if (strVal === '' || strVal === 'undefined' || strVal === 'null') continue;

          alertEntities.push({ type: mapping.type, value: strVal, field: mapping.path });

          if (!entitiesByType.has(mapping.type)) {
            entitiesByType.set(mapping.type, new Set());
          }
          entitiesByType.get(mapping.type)!.add(strVal);
        }
      }

      entitiesPerAlert.push({ alert_id: hit._id!, entities: alertEntities });
    }

    // Build summary
    const entitySummary = [...entitiesByType.entries()].map(([type, values]) => ({
      type,
      count: values.size,
      values: [...values].slice(0, 20), // Cap at 20 per type
    }));

    const totalEntities = entitySummary.reduce((sum, e) => sum + e.count, 0);

    return {
      entities_by_type: entitySummary,
      entities_per_alert: entitiesPerAlert,
      total_unique_entities: totalEntities,
      total_alerts_processed: alertsResponse.hits.hits.length,
      summary: `Extracted ${totalEntities} unique entities across ${entitySummary.length} types from ${alertsResponse.hits.hits.length} alerts.`,
    };
  },
  tags: ['security', 'alerts', 'entities', 'ioc'],
});

/** Safely get nested value from object using dot path */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}
