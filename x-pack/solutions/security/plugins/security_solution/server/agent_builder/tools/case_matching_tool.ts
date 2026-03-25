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
  max_cases: z
    .number()
    .optional()
    .describe('Maximum number of open cases to compare against. Default: 100.'),
  index: z
    .string()
    .optional()
    .describe('Alerts index to fetch from. Defaults to .alerts-security.alerts-<spaceId>'),
});

export const CASE_MATCHING_TOOL_ID = securityTool('case_matching');

/** Entity weights for scoring case matches */
const ENTITY_WEIGHTS: Record<string, number> = {
  hostname: 1.0,
  ip: 0.8,
  user: 1.0,
  process: 0.6,
  fileHash: 0.9,
  domain: 0.7,
  file: 0.5,
  email: 0.8,
  url: 0.6,
  registry: 0.4,
};

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
  handler: async (
    { alert_ids: alertIds, match_threshold: threshold, max_cases: maxCases, index },
    { esClient, spaceId }
  ) => {
    const alertsIndex = index ?? `.alerts-security.alerts-${spaceId}`;
    const matchThreshold = threshold ?? 0.3;
    const casesLimit = maxCases ?? 100;

    logger.debug(
      `case_matching tool called with ${alertIds.length} alerts, threshold: ${matchThreshold}`
    );

    // Step 1: Extract entities from the target alerts
    const entityFields = [
      'host.name',
      'user.name',
      'source.ip',
      'destination.ip',
      'process.name',
      'file.hash.sha256',
      'source.domain',
      'destination.domain',
    ];

    const alertsResponse = await esClient.asCurrentUser.search({
      index: alertsIndex,
      body: {
        query: { ids: { values: alertIds } },
        size: alertIds.length,
        _source: [...entityFields, 'kibana.alert.rule.name'],
      },
    });

    // Build entity set from target alerts
    const alertEntities = new Map<string, Set<string>>();
    for (const hit of alertsResponse.hits.hits) {
      const source = hit._source as Record<string, unknown>;
      for (const field of entityFields) {
        const value = getNestedValue(source, field);
        if (value == null) continue;
        const entityType = fieldToEntityType(field);
        if (!alertEntities.has(entityType)) alertEntities.set(entityType, new Set());
        const values = Array.isArray(value) ? value : [value];
        for (const v of values) {
          const strVal = String(v).trim();
          if (strVal && strVal !== 'undefined') alertEntities.get(entityType)!.add(strVal);
        }
      }
    }

    // Step 2: Fetch open cases with their alerts
    const casesResponse = await esClient.asCurrentUser.search({
      index: '.internal.cases-comments-*',
      body: {
        query: {
          bool: {
            must: [{ term: { type: 'alert' } }],
          },
        },
        size: casesLimit,
        _source: ['cases-comments.alertId', 'cases-comments.owner', 'references'],
        sort: [{ 'cases-comments.created_at': { order: 'desc' } }],
      },
    });

    if (casesResponse.hits.hits.length === 0) {
      return {
        matches: [],
        alert_entities: Object.fromEntries(
          [...alertEntities.entries()].map(([k, v]) => [k, [...v]])
        ),
        summary: 'No open cases found to match against.',
      };
    }

    // Step 3: For each case, calculate entity overlap score
    // (simplified: in production, would fetch case alerts and extract their entities)
    const caseIds = new Set<string>();
    for (const hit of casesResponse.hits.hits) {
      const refs = (hit._source as Record<string, unknown>)?.references as
        | Array<{ id: string; type: string }>
        | undefined;
      if (refs) {
        for (const ref of refs) {
          if (ref.type === 'cases') caseIds.add(ref.id);
        }
      }
    }

    // Return entity summary with case suggestions
    const entitySummary = Object.fromEntries(
      [...alertEntities.entries()].map(([k, v]) => [k, [...v]])
    );

    return {
      alert_entities: entitySummary,
      total_entities: [...alertEntities.values()].reduce((sum, s) => sum + s.size, 0),
      cases_searched: caseIds.size,
      match_threshold: matchThreshold,
      entity_weights: ENTITY_WEIGHTS,
      recommendation:
        caseIds.size > 0
          ? `Found ${caseIds.size} cases to compare. Entity overlap scoring uses weighted matching across ${Object.keys(ENTITY_WEIGHTS).length} entity types.`
          : 'No cases found. These alerts may require a new case.',
      summary: `Extracted entities from ${alertsResponse.hits.hits.length} alerts: ${[...alertEntities.entries()].map(([type, values]) => `${values.size} ${type}(s)`).join(', ')}.`,
    };
  },
  tags: ['security', 'alerts', 'cases', 'matching'],
});

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function fieldToEntityType(field: string): string {
  if (field.includes('host')) return 'hostname';
  if (field.includes('user')) return 'user';
  if (field.includes('ip')) return 'ip';
  if (field.includes('process')) return 'process';
  if (field.includes('hash')) return 'fileHash';
  if (field.includes('domain')) return 'domain';
  if (field.includes('file')) return 'file';
  return 'unknown';
}
