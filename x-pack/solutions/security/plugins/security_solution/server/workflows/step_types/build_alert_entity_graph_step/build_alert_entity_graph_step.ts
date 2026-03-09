/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { buildRelatedAlertsGraph } from './graph_builder';
import { parseTimeWindowToMs } from './time_window';

const DEFAULT_ENTITY_FIELDS = ['host.name', 'user.name', 'service.name'] as const;
interface EntityFieldConfig {
  field: string;
  score?: number;
  aliases?: Array<{ field: string; score?: number }>;
}
const DEFAULT_ENTITY_FIELD_CONFIG: EntityFieldConfig[] = DEFAULT_ENTITY_FIELDS.map((field) => ({
  field,
}));

export const buildAlertEntityGraphInputSchema = z.object({
  alertId: z.string().describe('The alert ID to find related alerts for'),
  alertIndex: z.string().describe('The alert index'),
  entity_fields: z
    .array(
      z.object({
        field: z.string(),
        score: z.coerce.number().finite().optional(),
        aliases: z
          .array(
            z.object({
              field: z.string(),
              score: z.coerce.number().finite().optional(),
            })
          )
          .optional(),
      })
    )
    .optional()
    .default(DEFAULT_ENTITY_FIELD_CONFIG)
    .describe(
      'Entity fields to extract and use for correlation. Each entry may provide an optional score override for that field, plus optional aliases (additional fields to match against using the same value). (default: host.name, user.name, service.name)'
    ),
  seed_window: z
    .string()
    .optional()
    .default('1h')
    .describe(
      'Initial time window around the seed alert timestamp (e.g., "1h", "24h"). Default: "1h"'
    ),
  expand_window: z
    .string()
    .optional()
    .default('1h')
    .describe(
      'Time window padding applied to the growing min/max timestamps as related alerts are found. Default: "1h"'
    ),
  max_depth: z.coerce
    .number()
    .finite()
    .int()
    .min(0)
    .optional()
    .default(3)
    .describe('Maximum recursion depth (number of expansion rounds). Default: 3'),
  max_alerts: z.coerce
    .number()
    .finite()
    .int()
    .min(1)
    .optional()
    .default(300)
    .describe('Hard cap on number of discovered alerts (including seed if included). Default: 300'),
  page_size: z.coerce
    .number()
    .finite()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .default(200)
    .describe('Elasticsearch page size per query. Default: 200'),
  max_terms_per_query: z.coerce
    .number()
    .finite()
    .int()
    .min(1)
    .optional()
    .default(500)
    .describe(
      'Maximum number of terms per `terms` query clause (chunked if exceeded). Default: 500'
    ),
  max_entities_per_field: z.coerce
    .number()
    .finite()
    .int()
    .min(1)
    .optional()
    .default(200)
    .describe('Maximum number of distinct entity values to track per entity field. Default: 200'),
  ignore_entities: z
    .array(z.object({ field: z.string(), values: z.array(z.string()) }))
    .optional()
    .default([])
    .describe(
      'Entity values to ignore for correlation/scoring (e.g. field=user.name values=[root,SYSTEM]). Ignored values do not contribute to edge scores and are not used for graph expansion.'
    ),
  min_entity_score: z.coerce
    .number()
    .finite()
    .min(1)
    .optional()
    .default(2)
    .describe(
      'Minimum total entity match score required to create an edge (sum of per-label scores). Default: 2'
    ),
  include_seed: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to include the seed alert as a node in the output graph. Default: true'),
});

const inputSchema = buildAlertEntityGraphInputSchema;

const outputSchema = z.object({
  nodes: z.array(z.object({ id: z.string() })),
  edges: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      score: z.number(),
      label_scores: z.record(z.string(), z.number()),
    })
  ),
  alerts: z.array(
    z.object({
      alert_id: z.string(),
      alert_index: z.string(),
      timestamp: z.string().optional(),
      rule_name: z.string().optional(),
      severity: z.string().optional(),
    })
  ),
  stats: z
    .object({
      depth_reached: z.number(),
      nodes: z.number(),
      edges: z.number(),
      queries: z.number(),
      time_range: z.object({ gte: z.string(), lte: z.string() }),
    })
    .optional(),
});

export const buildAlertEntityGraphStepDefinition = createServerStepDefinition({
  id: 'security.buildAlertEntityGraph',
  inputSchema,
  outputSchema,
  handler: async (context) => {
    try {
      const {
        alertId,
        alertIndex,
        entity_fields,
        seed_window,
        expand_window,
        max_depth,
        max_alerts,
        page_size,
        max_terms_per_query,
        max_entities_per_field,
        ignore_entities = [],
        min_entity_score,
        include_seed,
      } = context.input;
      const searchIndex = alertIndex;
      const esClient = context.contextManager.getScopedEsClient();

      const entityFieldConfigs = (
        entity_fields?.length ? entity_fields : DEFAULT_ENTITY_FIELD_CONFIG
      ).filter((f) => typeof f?.field === 'string' && f.field.length > 0);
      const entityFields = Array.from(
        new Set(
          entityFieldConfigs.flatMap((c) => [
            c.field,
            ...(Array.isArray(c.aliases) ? c.aliases : [])
              .map((a) => a.field)
              .filter((f) => typeof f === 'string'),
          ])
        )
      ).filter((f) => f.length > 0);
      const entityFieldScores: Record<string, number> = {};
      for (const c of entityFieldConfigs) {
        if (typeof c.score === 'number' && Number.isFinite(c.score)) {
          entityFieldScores[c.field] = Math.max(entityFieldScores[c.field] ?? -Infinity, c.score);
        }
      }

      const entityFieldAliases: Record<string, Array<{ field: string; score?: number }>> = {};
      for (const c of entityFieldConfigs) {
        const aliases = Array.isArray(c.aliases) ? c.aliases : [];
        const cleaned = aliases
          .filter(
            (a): a is { field: string; score?: number } =>
              typeof a?.field === 'string' && a.field.length > 0
          )
          .filter((a) => a.field !== c.field);
        if (cleaned.length) {
          entityFieldAliases[c.field] = cleaned.map((a) => ({
            field: a.field,
            score: typeof a.score === 'number' && Number.isFinite(a.score) ? a.score : undefined,
          }));
        }
      }

      const result = await buildRelatedAlertsGraph({
        esClient,
        seed: { alertId, alertIndex },
        searchIndex,
        entityFields,
        entityFieldAliases,
        seedWindowMs: parseTimeWindowToMs(seed_window),
        expandWindowMs: parseTimeWindowToMs(expand_window),
        maxDepth: max_depth,
        maxAlerts: max_alerts,
        pageSize: page_size,
        maxTermsPerQuery: max_terms_per_query,
        maxEntitiesPerField: max_entities_per_field,
        ignoreEntities: ignore_entities,
        entityFieldScores,
        minEntityScore: min_entity_score,
        includeSeed: include_seed,
      });

      return { output: result };
    } catch (error) {
      context.logger.error('Failed to get related alerts', error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to get related alerts'),
      };
    }
  },
});
