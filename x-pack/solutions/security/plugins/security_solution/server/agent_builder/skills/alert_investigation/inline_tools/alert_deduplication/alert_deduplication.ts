/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { SkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { deduplicateAlerts } from '@kbn/elastic-assistant-plugin/server';

export const ALERT_DEDUPLICATION_TOOL_ID = 'security.alert_deduplication';

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
    .describe('Alerts index to fetch from. Defaults to .alerts-security.alerts-<spaceId>'),
});

export const getAlertDeduplicationInlineTool = (): SkillBoundedTool => ({
  id: ALERT_DEDUPLICATION_TOOL_ID,
  type: ToolType.builtin,
  schema: alertDeduplicationSchema,
  description:
    'Find duplicate or similar security alerts using semantic similarity analysis. ' +
    'Compares alerts by rule name, host, user, process, network, and file attributes. ' +
    'Use when an analyst asks "are these alerts the same?", "find duplicate alerts", ' +
    'or "which of these alerts are related?".',
  handler: async (
    { alert_ids: alertIds, similarity_threshold: threshold, index },
    { esClient, spaceId, logger }
  ) => {
    const alertsIndex = index ?? `.alerts-security.alerts-${spaceId}`;

    logger.debug(
      `alert_deduplication tool called with ${alertIds.length} alerts, threshold: ${threshold ?? 0.85}`
    );

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

    if (alerts.length < 2) {
      return {
        duplicate_groups: [],
        total_alerts: alerts.length,
        message: 'Need at least 2 alerts to compare for duplicates.',
      };
    }

    const result = await deduplicateAlerts({
      alerts,
      esClient: esClient.asCurrentUser,
      logger,
      similarityThreshold: threshold,
    });

    return {
      duplicate_groups: result.clusters.map((cluster, idx) => ({
        group_id: idx + 1,
        leader_alert_id: cluster.leaderId,
        member_alert_ids: cluster.memberIds,
        count: cluster.memberIds.length + 1,
      })),
      unique_alerts: result.stats.uniqueClusters,
      duplicates_removed: result.stats.duplicatesRemoved,
      deduplication_rate: `${(result.stats.deduplicationRate * 100).toFixed(1)}%`,
      total_alerts: result.stats.totalAlerts,
      summary:
        result.stats.duplicatesRemoved > 0
          ? `Found ${result.clusters.filter((c) => c.memberIds.length > 0).length} groups of duplicate alerts. ${result.stats.duplicatesRemoved} duplicates removed (${(result.stats.deduplicationRate * 100).toFixed(1)}% dedup rate).`
          : `No duplicates found among ${alerts.length} alerts at threshold ${threshold ?? 0.85}.`,
    };
  },
});
