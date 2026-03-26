/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';

import { deduplicateAlerts } from '../deduplication';
import { extractEntitiesFromAlerts } from '../entity_extraction';
import { DEFAULT_PIPELINE_CONFIG } from '../types';
import { fetchAlertsByIds, adaptWorkflowLogger } from '../utils';
import { PIPELINE_LIMITS, SAFE_ALERTS_INDEX_PATTERN } from '../constants';
import { LiquidArraySchema, parseArrayInput } from './workflow_schema_helpers';

const SafeAlertIndexPattern = z
  .string()
  .default('.alerts-security.alerts-default')
  .refine((val) => SAFE_ALERTS_INDEX_PATTERN.test(val), {
    message: 'index_pattern must target .alerts-security.alerts-* indices',
  });

export const FetchUnprocessedAlertsStepId = 'security.fetchUnprocessedAlerts';

const FetchAlertsInputSchema = z.object({
  index_pattern: SafeAlertIndexPattern,
  max_alerts: z
    .number()
    .min(1)
    .max(PIPELINE_LIMITS.MAX_ALERTS_PER_RUN)
    .default(PIPELINE_LIMITS.DEFAULT_MAX_ALERTS),
  lookback_minutes: z
    .number()
    .min(1)
    .max(PIPELINE_LIMITS.MAX_LOOKBACK_MINUTES)
    .default(PIPELINE_LIMITS.DEFAULT_LOOKBACK_MINUTES),
});

const FetchAlertsOutputSchema = z.object({
  alert_ids: z.array(z.string()),
  total_alerts: z.number(),
});

export const fetchUnprocessedAlertsStep = createServerStepDefinition({
  id: FetchUnprocessedAlertsStepId,
  category: StepCategory.Kibana,
  label: 'Fetch Unprocessed Security Alerts',
  description:
    'Fetches security alerts that have not yet been processed by the investigation pipeline.',
  documentation: {
    details: 'Queries open and acknowledged security alerts within the lookback window.',
    examples: [],
  },
  inputSchema: FetchAlertsInputSchema,
  outputSchema: FetchAlertsOutputSchema,
  handler: async (context) => {
    const esClient = context.contextManager.getScopedEsClient();
    const {
      index_pattern: indexPattern,
      max_alerts: maxAlerts,
      lookback_minutes: lookbackMinutes,
    } = context.input;

    const now = new Date();
    const lookbackTime = new Date(now.getTime() - lookbackMinutes * 60 * 1000);

    const result = await esClient.search({
      index: indexPattern,
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
      _source: false,
      fields: ['_id'],
    });

    const alertIds = result.hits.hits
      .filter((hit): hit is typeof hit & { _id: string } => hit._id != null)
      .map((hit) => hit._id);

    context.logger.info(`Fetched ${alertIds.length} unprocessed alerts`);

    return {
      output: {
        alert_ids: alertIds,
        total_alerts: alertIds.length,
      },
    };
  },
});

export const DeduplicateAlertsStepId = 'security.deduplicateAlerts';

const DedupInputSchema = z.object({
  alert_ids: LiquidArraySchema,
  index_pattern: SafeAlertIndexPattern,
  similarity_threshold: z.number().min(0).max(1).default(PIPELINE_LIMITS.JACCARD_SIMILARITY_THRESHOLD),
});

const DedupOutputSchema = z.object({
  leader_alert_ids: z.array(z.string()),
  total_before: z.number(),
  total_after: z.number(),
  dedup_rate: z.number(),
});

export const deduplicateAlertsStep = createServerStepDefinition({
  id: DeduplicateAlertsStepId,
  category: StepCategory.Kibana,
  label: 'Deduplicate Security Alerts',
  description: 'Groups similar alerts using feature-text similarity and selects cluster leaders.',
  documentation: {
    details: 'Uses rule name, host, and entity overlap to identify duplicate alerts.',
    examples: [],
  },
  inputSchema: DedupInputSchema,
  outputSchema: DedupOutputSchema,
  handler: async (context) => {
    const esClient = context.contextManager.getScopedEsClient();
    const logger = adaptWorkflowLogger(context.logger);
    const { index_pattern: indexPattern, similarity_threshold: threshold } = context.input;
    const raw = context.input.alert_ids;
    context.logger.info(
      `DEBUG: type=${typeof raw}, isArray=${Array.isArray(raw)}, ` +
      `len=${Array.isArray(raw) ? raw.length : 'N/A'}, ` +
      `nested=${Array.isArray(raw) && raw.length > 0 ? Array.isArray(raw[0]) : 'N/A'}, ` +
      `first=${Array.isArray(raw) ? JSON.stringify(raw[0]).substring(0, 80) : String(raw).substring(0, 80)}`
    );
    const alertIds = parseArrayInput(raw);
    context.logger.info(`DEBUG parsed: ${alertIds.length} IDs, first=${alertIds[0]}, last=${alertIds[alertIds.length - 1]}`);

    if (alertIds.length === 0) {
      return { output: { leader_alert_ids: [], total_before: 0, total_after: 0, dedup_rate: 0 } };
    }

    const alerts = await fetchAlertsByIds({ esClient, indexPattern, alertIds, logger });

    const dedupResult = await deduplicateAlerts({
      alerts,
      esClient,
      logger,
      similarityThreshold: threshold,
    });

    return {
      output: {
        leader_alert_ids: dedupResult.leaders.map((l) => l._id),
        total_before: dedupResult.stats.totalAlerts,
        total_after: dedupResult.stats.uniqueClusters,
        dedup_rate: dedupResult.stats.deduplicationRate,
      },
    };
  },
});

export const ExtractEntitiesStepId = 'security.extractEntities';

const ExtractInputSchema = z.object({
  alert_ids: LiquidArraySchema,
  index_pattern: SafeAlertIndexPattern,
});

const ExtractOutputSchema = z.object({
  entities: z.array(
    z.object({
      type_key: z.string(),
      value: z.string(),
      alert_id: z.string(),
    })
  ),
  total_entities: z.number(),
});

export const extractEntitiesStep = createServerStepDefinition({
  id: ExtractEntitiesStepId,
  category: StepCategory.Kibana,
  label: 'Extract Entities from Alerts',
  description:
    'Extracts observable entities (IPs, hostnames, users, file hashes, etc.) from alert ECS fields.',
  documentation: {
    details: 'Maps 30+ ECS fields to 13 observable types for downstream case matching.',
    examples: [],
  },
  inputSchema: ExtractInputSchema,
  outputSchema: ExtractOutputSchema,
  handler: async (context) => {
    const esClient = context.contextManager.getScopedEsClient();
    const logger = adaptWorkflowLogger(context.logger);
    const { index_pattern: indexPattern } = context.input;
    const alertIds = parseArrayInput(context.input.alert_ids);

    if (alertIds.length === 0) {
      return { output: { entities: [], total_entities: 0 } };
    }

    const alerts = await fetchAlertsByIds({
      esClient,
      indexPattern,
      alertIds,
      logger,
    });

    const result = extractEntitiesFromAlerts({
      alerts,
      config: DEFAULT_PIPELINE_CONFIG.entityExtraction,
      logger,
    });

    return {
      output: {
        entities: result.entities.map((e) => ({
          type_key: e.typeKey,
          value: e.value,
          alert_id: e.alertId,
        })),
        total_entities: result.stats.entitiesAfterDedup,
      },
    };
  },
});

export const TagProcessedAlertsStepId = 'security.tagProcessedAlerts';

const TagInputSchema = z.object({
  alert_ids: LiquidArraySchema,
  index_pattern: SafeAlertIndexPattern,
});

const TagOutputSchema = z.object({
  tagged_count: z.number(),
});

export const tagProcessedAlertsStep = createServerStepDefinition({
  id: TagProcessedAlertsStepId,
  category: StepCategory.Kibana,
  label: 'Tag Alerts as Processed',
  description: 'Tags processed alerts to prevent re-processing in subsequent pipeline runs.',
  documentation: {
    details:
      'Uses update_by_query to tag all unprocessed alerts in the lookback window. ' +
      'Does not depend on alert IDs from previous steps (avoids liquid template size limits).',
    examples: [],
  },
  inputSchema: TagInputSchema,
  outputSchema: TagOutputSchema,
  handler: async (context) => {
    const esClient = context.contextManager.getScopedEsClient();
    const { index_pattern: indexPattern } = context.input;
    const validIds = parseArrayInput(context.input.alert_ids).filter(Boolean);

    if (validIds.length === 0) {
      return { output: { tagged_count: 0 } };
    }

    context.logger.info(`Tagging ${validIds.length} alerts as processed`);

    const nowIso = new Date().toISOString();
    const result = await esClient.updateByQuery({
      index: indexPattern,
      refresh: true,
      query: {
        ids: { values: validIds },
      },
      script: {
        source:
          "if (ctx._source.kibana == null) ctx._source.kibana = new HashMap();" +
          "if (ctx._source.kibana.alert == null) ctx._source.kibana.alert = new HashMap();" +
          "if (ctx._source.kibana.alert.pipeline == null) ctx._source.kibana.alert.pipeline = new HashMap();" +
          "ctx._source.kibana.alert.pipeline.processed = true;" +
          "ctx._source.kibana.alert.pipeline.processed_at = params.now;",
        params: { now: nowIso },
        lang: 'painless',
      },
    });

    const tagged = result.updated ?? 0;
    context.logger.info(`Tagged ${tagged} alerts as processed`);

    return { output: { tagged_count: tagged } };
  },
});
