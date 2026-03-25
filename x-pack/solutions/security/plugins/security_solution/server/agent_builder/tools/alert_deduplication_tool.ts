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

const alertDeduplicationSchema = z.object({
  alert_ids: z
    .array(z.string())
    .describe(
      'Array of alert IDs to check for duplicates. Provide 2 or more alert IDs to compare.'
    ),
  similarity_threshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe(
      'Similarity threshold (0-1) for considering alerts as duplicates. Default: 0.85. Lower values find more duplicates.'
    ),
  index: z
    .string()
    .optional()
    .describe(
      'Alerts index to fetch from. Defaults to .alerts-security.alerts-<spaceId>'
    ),
});

export const ALERT_DEDUPLICATION_TOOL_ID = securityTool('alert_deduplication');

export const alertDeduplicationTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof alertDeduplicationSchema> => ({
  id: ALERT_DEDUPLICATION_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Find duplicate or similar security alerts using semantic similarity analysis. ' +
    'Compares alerts by rule name, host, user, process, network, and file attributes. ' +
    'Use when an analyst asks "are these alerts the same?", "find duplicate alerts", ' +
    'or "which of these alerts are related?".',
  schema: alertDeduplicationSchema,
  availability: {
    cacheMode: 'space',
    handler: async ({ request }) =>
      getAgentBuilderResourceAvailability({ core, request, logger }),
  },
  handler: async ({ alert_ids: alertIds, similarity_threshold: threshold, index }, { esClient, spaceId }) => {
    const alertsIndex = index ?? `.alerts-security.alerts-${spaceId}`;
    const similarityThreshold = threshold ?? 0.85;

    logger.debug(
      `alert_deduplication tool called with ${alertIds.length} alerts, threshold: ${similarityThreshold}`
    );

    // Fetch alerts
    const alertsResponse = await esClient.asCurrentUser.search({
      index: alertsIndex,
      body: {
        query: { ids: { values: alertIds } },
        size: alertIds.length,
        _source: [
          'kibana.alert.rule.name',
          'host.name',
          'user.name',
          'process.name',
          'process.command_line',
          'source.ip',
          'destination.ip',
          'file.name',
          'file.hash.sha256',
          'kibana.alert.severity',
          'kibana.alert.risk_score',
        ],
      },
    });

    const alerts = alertsResponse.hits.hits;

    if (alerts.length < 2) {
      return {
        duplicate_groups: [],
        total_alerts: alerts.length,
        message: 'Need at least 2 alerts to compare for duplicates.',
      };
    }

    // Extract features for comparison
    const extractFeatures = (source: Record<string, unknown>): string => {
      const parts: string[] = [];
      const get = (obj: Record<string, unknown>, path: string): string => {
        const keys = path.split('.');
        let current: unknown = obj;
        for (const key of keys) {
          if (current == null || typeof current !== 'object') return '';
          current = (current as Record<string, unknown>)[key];
        }
        return String(current ?? '');
      };

      parts.push(get(source, 'kibana.alert.rule.name'));
      parts.push(get(source, 'host.name'));
      parts.push(get(source, 'user.name'));
      parts.push(get(source, 'process.name'));
      parts.push(get(source, 'source.ip'));
      parts.push(get(source, 'destination.ip'));
      parts.push(get(source, 'file.name'));

      return parts.filter(Boolean).join(' ');
    };

    // Jaccard similarity
    const jaccardSimilarity = (a: string, b: string): number => {
      const setA = new Set(a.toLowerCase().split(/\s+/));
      const setB = new Set(b.toLowerCase().split(/\s+/));
      const intersection = new Set([...setA].filter((x) => setB.has(x)));
      const union = new Set([...setA, ...setB]);
      return union.size === 0 ? 0 : intersection.size / union.size;
    };

    // Build similarity pairs
    const features = alerts.map((hit) => ({
      id: hit._id!,
      features: extractFeatures(hit._source as Record<string, unknown>),
      ruleName: ((hit._source as Record<string, unknown>)?.kibana as Record<string, unknown>)?.alert
        ? 'unknown'
        : 'unknown',
    }));

    // Find duplicate groups using Union-Find
    const parent = new Map<string, string>();
    const find = (x: string): string => {
      if (!parent.has(x)) parent.set(x, x);
      if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
      return parent.get(x)!;
    };
    const unite = (a: string, b: string) => {
      parent.set(find(a), find(b));
    };

    const similarPairs: Array<{ alert_a: string; alert_b: string; similarity: number }> = [];

    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        const sim = jaccardSimilarity(features[i].features, features[j].features);
        if (sim >= similarityThreshold) {
          unite(features[i].id, features[j].id);
          similarPairs.push({
            alert_a: features[i].id,
            alert_b: features[j].id,
            similarity: Math.round(sim * 100) / 100,
          });
        }
      }
    }

    // Group by root
    const groups = new Map<string, string[]>();
    for (const f of features) {
      const root = find(f.id);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root)!.push(f.id);
    }

    const duplicateGroups = [...groups.values()]
      .filter((g) => g.length > 1)
      .map((alertIdsInGroup, idx) => ({
        group_id: idx + 1,
        alert_ids: alertIdsInGroup,
        count: alertIdsInGroup.length,
      }));

    return {
      duplicate_groups: duplicateGroups,
      unique_alerts: [...groups.values()].filter((g) => g.length === 1).length,
      total_alerts: alerts.length,
      threshold_used: similarityThreshold,
      similar_pairs: similarPairs,
      summary:
        duplicateGroups.length > 0
          ? `Found ${duplicateGroups.length} groups of duplicate alerts out of ${alerts.length} total.`
          : `No duplicates found among ${alerts.length} alerts at threshold ${similarityThreshold}.`,
    };
  },
  tags: ['security', 'alerts', 'deduplication'],
});
