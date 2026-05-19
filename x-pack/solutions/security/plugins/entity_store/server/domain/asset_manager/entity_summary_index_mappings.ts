/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

type MappingProperties = NonNullable<MappingTypeMapping['properties']>;

/**
 * Explicit mappings for API-written `entity.attributes.summary` on the v2 latest index.
 *
 * Not wired through `getEntityFieldsDescriptions()` (no ESQL extraction). Merged in
 * `component_templates.ts` for latest component templates only.
 *
 * `highlights` is an array of `{ title, text }` objects in JSON; ES `object` mapping
 * applies the same property mapping to each array element (no `nested` — we only read
 * `_source`, not query per-highlight).
 *
 * `staleness.snapshot` uses `dynamic: true` so new signal keys can be indexed without
 * another `MAPPING_VERSION` bump; known signals are typed for predictable coercion.
 */
export const ENTITY_SUMMARY_INDEX_MAPPING = {
  'entity.attributes.summary.generated_at': { type: 'long' },
  'entity.attributes.summary.generated_by': { type: 'keyword', ignore_above: 1024 },
  'entity.attributes.summary.highlights': {
    type: 'object',
    properties: {
      title: {
        type: 'keyword',
        ignore_above: 256,
        fields: {
          text: { type: 'match_only_text' },
        },
      },
      text: { type: 'text' },
    },
  },
  'entity.attributes.summary.recommendedActions': { type: 'keyword', ignore_above: 2048 },
  'entity.attributes.summary.staleness.enabled_signals': { type: 'keyword' },
  'entity.attributes.summary.staleness.snapshot': {
    type: 'object',
    dynamic: true,
    properties: {
      risk_score: { type: 'float' },
      anomaly_job_ids: { type: 'keyword' },
      rule_names: { type: 'keyword' },
    },
  },
} as const satisfies MappingProperties;
