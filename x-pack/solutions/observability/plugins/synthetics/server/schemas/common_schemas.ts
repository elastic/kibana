/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

/**
 * Schema for monitor filter options (projects, tags, locations, etc.)
 * Shared across multiple embeddable types
 */
export const monitorOptionSchema = schema.object({
  label: schema.string({
    meta: { description: 'Display label for the filter option' },
  }),
  value: schema.string({
    meta: { description: 'Value for the filter option' },
  }),
});

export type MonitorOption = TypeOf<typeof monitorOptionSchema>;

/**
 * Schema for monitor filters
 * Shared across multiple embeddable types to ensure consistent filtering
 */
export const monitorFiltersSchema = schema.object({
  projects: schema.maybe(
    schema.arrayOf(monitorOptionSchema, {
      maxSize: 100,
      meta: { description: 'Filter by project' },
    })
  ),
  tags: schema.maybe(
    schema.arrayOf(monitorOptionSchema, {
      maxSize: 100,
      meta: { description: 'Filter by tags' },
    })
  ),
  monitor_ids: schema.maybe(
    schema.arrayOf(monitorOptionSchema, {
      maxSize: 5000,
      meta: { description: 'Filter by monitor IDs' },
    })
  ),
  monitor_types: schema.maybe(
    schema.arrayOf(monitorOptionSchema, {
      maxSize: 10,
      meta: { description: 'Filter by monitor types' },
    })
  ),
  locations: schema.maybe(
    schema.arrayOf(monitorOptionSchema, {
      maxSize: 100,
      meta: { description: 'Filter by monitor locations' },
    })
  ),
});

export type MonitorFilters = TypeOf<typeof monitorFiltersSchema>;
