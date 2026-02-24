/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { z } from '@kbn/zod/v4';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { i18n } from '@kbn/i18n';

const DEFAULT_ENTITY_FIELDS = ['host.name', 'user.name', 'service.name'] as const;
interface EntityFieldConfig {
  field: string;
  score?: number;
  aliases?: Array<{ field: string; score?: number }>;
}
const DEFAULT_ENTITY_FIELD_CONFIG: EntityFieldConfig[] = DEFAULT_ENTITY_FIELDS.map((field) => ({
  field,
}));

const inputSchema = z.object({
  alertId: z.string().describe('The alert ID to find related alerts for'),
  alertIndex: z.string().describe('The alert index'),
  entity_fields: z
    .array(
      z.object({
        field: z.string(),
        score: z.number().finite().optional(),
        aliases: z
          .array(
            z.object({
              field: z.string(),
              score: z.number().finite().optional(),
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
  max_depth: z
    .number()
    .int()
    .min(0)
    .optional()
    .default(3)
    .describe('Maximum recursion depth (number of expansion rounds). Default: 3'),
  max_alerts: z
    .number()
    .int()
    .min(1)
    .optional()
    .default(300)
    .describe('Hard cap on number of discovered alerts (including seed if included). Default: 300'),
  page_size: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .default(200)
    .describe('Elasticsearch page size per query. Default: 200'),
  max_terms_per_query: z
    .number()
    .int()
    .min(1)
    .optional()
    .default(500)
    .describe(
      'Maximum number of terms per `terms` query clause (chunked if exceeded). Default: 500'
    ),
  max_entities_per_field: z
    .number()
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
  min_entity_score: z
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

export const buildAlertEntityGraphStepDefinition: PublicStepDefinition = {
  id: 'security.buildAlertEntityGraph',
  inputSchema,
  outputSchema,
  label: i18n.translate('xpack.securitySolution.workflows.steps.buildAlertEntityGraph.label', {
    defaultMessage: 'Build Alert Entity Graph',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.buildAlertEntityGraph.description',
    {
      defaultMessage:
        'Build a graph of alerts correlated by shared entities (e.g. host, user, service) via BFS traversal within an expanding time window',
    }
  ),
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/link')
      .then(({ icon }) => ({ default: icon }))
      .catch(() =>
        import('@elastic/eui/es/components/icon/assets/search').then(({ icon }) => ({
          default: icon,
        }))
      )
  ),
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.buildAlertEntityGraph.documentation.details',
      {
        defaultMessage:
          'Recursively discovers alerts correlated by shared entities (e.g. host, user, service) within a configurable, expanding time window and returns a nodes/edges graph. Correlation is controlled by a score threshold (min_entity_score + per-field score overrides; sums per-label scores).',
      }
    ),
    examples: [
      `## Build alert entity graph
\`\`\`yaml
- name: build_alert_entity_graph
  type: security.buildAlertEntityGraph
  with:
    alertId: "{{ variables.alert_id }}"
    alertIndex: "{{ variables.alert_index }}"
    include_seed: true
    entity_fields:
      - field: "process.entity_id"
        score: 5
      - field: "agent.id"
        score: 4
      - field: "user.id"
        score: 4
      - field: "host.name"
        score: 2
      - field: "user.name"
        score: 2
      - field: "service.name"
        score: 1
      - field: "source.ip"
        score: 1
        aliases:
          - field: "destination.ip"
            score: 4
    min_entity_score: 4
    ignore_entities:
      - field: "user.name"
        values: ["root", "SYSTEM", "Administrator"]
    seed_window: "1h"
    expand_window: "1h"
    max_depth: 3
    max_alerts: 300
\`\`\``,
    ],
  },
};
