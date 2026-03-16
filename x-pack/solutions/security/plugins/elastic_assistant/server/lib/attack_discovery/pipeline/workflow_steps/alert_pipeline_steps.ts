/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';

import { deduplicateAlerts } from '../deduplication';
import { extractEntitiesFromAlerts } from '../entity_extraction';
import { DEFAULT_PIPELINE_CONFIG } from '../types';

const SAFE_ALERTS_INDEX = /^\.alerts-security\.alerts-[a-z0-9*-]+$/;

const SafeAlertIndexPattern = z
  .string()
  .default('.alerts-security.alerts-default')
  .refine((val) => SAFE_ALERTS_INDEX.test(val), {
    message: 'index_pattern must target .alerts-security.alerts-* indices',
  });

export const FetchUnprocessedAlertsStepId = 'security.fetchUnprocessedAlerts';

const FetchAlertsInputSchema = z.object({
  index_pattern: SafeAlertIndexPattern,
  max_alerts: z.number().min(1).max(10000).default(500),
  lookback_minutes: z.number().min(1).max(10080).default(15),
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
                must_not: [{ exists: { field: 'kibana.alert.pipeline.processed' } }],
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
  alert_ids: z.array(z.string()),
  index_pattern: SafeAlertIndexPattern,
  similarity_threshold: z.number().default(0.85),
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
    const {
      alert_ids: alertIds,
      index_pattern: indexPattern,
      similarity_threshold: threshold,
    } = context.input;

    if (alertIds.length === 0) {
      return { output: { leader_alert_ids: [], total_before: 0, total_after: 0, dedup_rate: 0 } };
    }

    const alertDocs = await esClient.mget({
      index: indexPattern,
      ids: alertIds,
    });

    const alerts = alertDocs.docs
      .filter(
        (doc): doc is typeof doc & { found: true; _id: string; _source: Record<string, unknown> } =>
          'found' in doc &&
          (doc as { found?: boolean }).found === true &&
          '_source' in doc &&
          doc._id != null
      )
      .map((doc) => ({
        _id: doc._id,
        _source: doc._source,
      }));

    const result = await deduplicateAlerts({
      alerts,
      esClient,
      logger: context.logger as Logger,
      similarityThreshold: threshold,
    });

    return {
      output: {
        leader_alert_ids: result.leaders.map((l) => l._id),
        total_before: result.stats.totalAlerts,
        total_after: result.stats.uniqueClusters,
        dedup_rate: result.stats.deduplicationRate,
      },
    };
  },
});

export const ExtractEntitiesStepId = 'security.extractEntities';

const ExtractInputSchema = z.object({
  alert_ids: z.array(z.string()),
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
    const { alert_ids: alertIds, index_pattern: indexPattern } = context.input;

    if (alertIds.length === 0) {
      return { output: { entities: [], total_entities: 0 } };
    }

    const alertDocs = await esClient.mget({
      index: indexPattern,
      ids: alertIds,
    });

    const alerts = alertDocs.docs
      .filter(
        (doc): doc is typeof doc & { found: true; _id: string; _source: Record<string, unknown> } =>
          'found' in doc &&
          (doc as { found?: boolean }).found === true &&
          '_source' in doc &&
          doc._id != null
      )
      .map((doc) => ({
        _id: doc._id,
        _source: doc._source,
      }));

    const result = extractEntitiesFromAlerts({
      alerts,
      config: DEFAULT_PIPELINE_CONFIG.entityExtraction,
      logger: context.logger as Logger,
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
  alert_ids: z.array(z.string()),
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
    details: 'Sets kibana.alert.pipeline.processed field on alert documents.',
    examples: [],
  },
  inputSchema: TagInputSchema,
  outputSchema: TagOutputSchema,
  handler: async (context) => {
    const esClient = context.contextManager.getScopedEsClient();
    const { alert_ids: alertIds, index_pattern: indexPattern } = context.input;

    if (alertIds.length === 0) {
      return { output: { tagged_count: 0 } };
    }

    const body = alertIds.flatMap((id) => [
      { update: { _id: id, _index: indexPattern } },
      {
        doc: {
          kibana: {
            alert: { pipeline: { processed: true, processed_at: new Date().toISOString() } },
          },
        },
      },
    ]);

    const result = await esClient.bulk({ operations: body, refresh: 'wait_for' });
    const failedCount = result.errors
      ? result.items.filter((item) => item.update?.error).length
      : 0;

    if (failedCount > 0) {
      context.logger.warn(`Failed to tag ${failedCount}/${alertIds.length} alerts as processed`);
    }

    return { output: { tagged_count: alertIds.length - failedCount } };
  },
});
