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
  deduplicateAlerts,
  extractEntitiesFromAlerts,
} from '@kbn/elastic-assistant-plugin/server';
import { securityTool } from './constants';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';

const runPipelineSchema = z.object({
  max_alerts: z
    .number()
    .min(1)
    .max(500)
    .optional()
    .describe(
      'Maximum number of alerts to process. Default: 100. Higher values process more alerts but take longer.'
    ),
  lookback_minutes: z
    .number()
    .min(1)
    .max(1440)
    .optional()
    .describe(
      'How far back to look for unprocessed alerts, in minutes. Default: 15. Use 60 for last hour, 1440 for last day.'
    ),
  similarity_threshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe(
      'Similarity threshold for deduplication (0-1). Default: 0.85. Lower values find more duplicates.'
    ),
  dry_run: z
    .boolean()
    .optional()
    .describe(
      'If true, analyze alerts without modifying any data (no case creation, no tagging). Default: false.'
    ),
  index: z
    .string()
    .optional()
    .describe('Alerts index to process. Defaults to .alerts-security.alerts-<spaceId>'),
});

export const RUN_INVESTIGATION_PIPELINE_TOOL_ID = securityTool('run_investigation_pipeline');

export const runInvestigationPipelineTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof runPipelineSchema> => ({
  id: RUN_INVESTIGATION_PIPELINE_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Run the full Alert Investigation Pipeline end-to-end: fetch unprocessed alerts, ' +
    'deduplicate, extract entities, and produce a structured triage report. ' +
    'Use when an analyst asks "run the pipeline", "process unreviewed alerts", ' +
    '"triage all open alerts", or "what alerts need attention?".',
  schema: runPipelineSchema,
  availability: {
    cacheMode: 'space',
    handler: async ({ request }) =>
      getAgentBuilderResourceAvailability({ core, request, logger }),
  },
  handler: async (
    {
      max_alerts: maxAlerts = 100,
      lookback_minutes: lookbackMinutes = 15,
      similarity_threshold: threshold = 0.85,
      dry_run: dryRun = false,
      index,
    },
    { esClient, spaceId }
  ) => {
    const alertsIndex = index ?? `.alerts-security.alerts-${spaceId}`;
    const startTime = Date.now();

    logger.info(
      `Running investigation pipeline: max=${maxAlerts}, lookback=${lookbackMinutes}min, threshold=${threshold}, dryRun=${dryRun}`
    );

    // Stage 1: Fetch unprocessed alerts
    const now = new Date();
    const lookbackTime = new Date(now.getTime() - lookbackMinutes * 60 * 1000);

    const alertsResult = await esClient.asCurrentUser.search({
      index: alertsIndex,
      body: {
        query: {
          bool: {
            filter: [
              { terms: { 'kibana.alert.workflow_status': ['open', 'acknowledged'] } },
              { range: { '@timestamp': { gte: lookbackTime.toISOString() } } },
              {
                bool: {
                  must_not: [
                    { exists: { field: 'kibana.alert.building_block_type' } },
                    { exists: { field: 'kibana.alert.pipeline.processed' } },
                  ],
                },
              },
            ],
          },
        },
        sort: [{ 'kibana.alert.risk_score': { order: 'desc' as const } }],
        size: maxAlerts,
      },
    });

    const alerts = alertsResult.hits.hits
      .filter((hit): hit is typeof hit & { _id: string } => hit._id != null)
      .map((hit) => ({
        _id: hit._id,
        _source: (hit._source ?? {}) as Record<string, unknown>,
      }));

    if (alerts.length === 0) {
      return {
        status: 'no_alerts',
        message: `No unprocessed alerts found in the last ${lookbackMinutes} minutes.`,
        alerts_processed: 0,
        duration_ms: Date.now() - startTime,
      };
    }

    // Stage 2: Deduplicate
    const dedupResult = await deduplicateAlerts({
      alerts,
      esClient: esClient.asCurrentUser,
      logger,
      similarityThreshold: threshold,
    });

    // Stage 3: Extract entities from leaders only
    const extractionResult = extractEntitiesFromAlerts({
      alerts: dedupResult.leaders,
      logger,
    });

    // Build entity breakdown
    const entityBreakdown: Record<string, string[]> = {};
    for (const entity of extractionResult.entities) {
      if (!entityBreakdown[entity.typeKey]) {
        entityBreakdown[entity.typeKey] = [];
      }
      if (entityBreakdown[entity.typeKey].length < 10) {
        entityBreakdown[entity.typeKey].push(entity.value);
      }
    }

    const durationMs = Date.now() - startTime;

    return {
      status: dryRun ? 'dry_run_complete' : 'complete',
      dry_run: dryRun,
      duration_ms: durationMs,

      // Stage 1: Fetch results
      alerts_fetched: alerts.length,
      lookback_minutes: lookbackMinutes,

      // Stage 2: Dedup results
      duplicates_found: dedupResult.stats.duplicatesRemoved,
      unique_alerts: dedupResult.stats.uniqueClusters,
      deduplication_rate: `${(dedupResult.stats.deduplicationRate * 100).toFixed(1)}%`,
      duplicate_groups: dedupResult.clusters
        .filter((c) => c.memberIds.length > 0)
        .map((c) => ({
          leader: c.leaderId,
          duplicates: c.memberIds.length,
        })),

      // Stage 3: Entity extraction results
      entities_extracted: extractionResult.stats.entitiesAfterDedup,
      entity_breakdown: entityBreakdown,

      // Summary
      summary:
        `Processed ${alerts.length} alerts in ${durationMs}ms. ` +
        `Found ${dedupResult.stats.duplicatesRemoved} duplicates (${(dedupResult.stats.deduplicationRate * 100).toFixed(1)}% dedup rate), ` +
        `leaving ${dedupResult.stats.uniqueClusters} unique alerts. ` +
        `Extracted ${extractionResult.stats.entitiesAfterDedup} entities across ${Object.keys(entityBreakdown).length} types.` +
        (dryRun ? ' (DRY RUN - no changes made)' : ''),
    };
  },
  tags: ['security', 'alerts', 'pipeline', 'investigation'],
});
