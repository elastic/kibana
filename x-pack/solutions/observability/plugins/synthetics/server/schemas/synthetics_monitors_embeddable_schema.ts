/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';

/**
 * Schema for monitor filter options (projects, tags, locations, etc.)
 */
const monitorOptionSchema = schema.object({
  label: schema.string({
    meta: { description: 'Display label for the filter option' },
  }),
  value: schema.string({
    meta: { description: 'Value for the filter option' },
  }),
});

/**
 * Schema for monitor filters applied to the monitors embeddable
 */
const monitorFiltersSchema = schema.object({
  projects: schema.maybe(
    schema.arrayOf(monitorOptionSchema, {
      meta: { description: 'Filter by project' },
    })
  ),
  tags: schema.maybe(
    schema.arrayOf(monitorOptionSchema, {
      meta: { description: 'Filter by tags' },
    })
  ),
  monitor_ids: schema.maybe(
    schema.arrayOf(monitorOptionSchema, {
      meta: { description: 'Filter by monitor IDs' },
    })
  ),
  monitor_types: schema.maybe(
    schema.arrayOf(monitorOptionSchema, {
      meta: { description: 'Filter by monitor types' },
    })
  ),
  locations: schema.maybe(
    schema.arrayOf(monitorOptionSchema, {
      meta: { description: 'Filter by monitor locations' },
    })
  ),
});

/**
 * Schema for the custom state of the monitors embeddable
 */
const monitorsCustomStateSchema = schema.object({
  filters: schema.maybe(monitorFiltersSchema),
  view: schema.maybe(
    schema.oneOf([schema.literal('cardView'), schema.literal('compactView')], {
      meta: {
        description: 'View mode for the monitors embeddable (defaults to cardView)',
      },
    })
  ),
});

/**
 * Complete schema for the Synthetics Monitors embeddable
 * Combines serialized titles and custom state
 */
export const syntheticsMonitorsEmbeddableSchema = schema.allOf(
  [monitorsCustomStateSchema, serializedTitlesSchema],
  {
    meta: {
      description: 'Synthetics monitors embeddable schema',
    },
  }
);

export type SyntheticsMonitorsEmbeddableState = TypeOf<typeof syntheticsMonitorsEmbeddableSchema>;
