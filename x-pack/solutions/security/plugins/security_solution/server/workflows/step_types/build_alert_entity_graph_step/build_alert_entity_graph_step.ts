/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { buildRelatedAlertsGraph } from './graph_builder';
import { parseTimeWindowToMs } from './time_window';
import {
  buildAlertEntityGraphStepCommonDefinition,
  buildAlertEntityGraphInputSchema,
} from '../../../../common/workflows/step_types/build_alert_entity_graph_step/build_alert_entity_graph_step_common';

export { buildAlertEntityGraphInputSchema };

const DEFAULT_ENTITY_FIELDS = ['host.name', 'user.name', 'service.name'] as const;
interface EntityFieldConfig {
  field: string;
  score?: number;
  aliases?: Array<{ field: string; score?: number }>;
}
const DEFAULT_ENTITY_FIELD_CONFIG: EntityFieldConfig[] = DEFAULT_ENTITY_FIELDS.map((field) => ({
  field,
}));

export const buildAlertEntityGraphStepDefinition = createServerStepDefinition({
  ...buildAlertEntityGraphStepCommonDefinition,
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
