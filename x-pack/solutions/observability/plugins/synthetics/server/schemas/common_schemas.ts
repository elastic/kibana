/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

/**
 * Schema for monitor filter options (projects, tags, locations, etc.)
 * Shared across multiple embeddable types
 */
export const monitorOptionSchema = z
  .object({
    label: z.string().meta({ description: 'Display label for the filter option' }),
    value: z.string().meta({ description: 'Value for the filter option' }),
  })
  .strict();

export type MonitorOption = z.output<typeof monitorOptionSchema>;

/**
 * Schema for monitor filters
 * Shared across multiple embeddable types to ensure consistent filtering
 */
export const monitorFiltersSchema = z
  .object({
    projects: z
      .array(monitorOptionSchema)
      .max(100)
      .optional()
      .meta({ description: 'Filter by project' }),
    tags: z.array(monitorOptionSchema).max(100).optional().meta({ description: 'Filter by tags' }),
    monitor_ids: z
      .array(monitorOptionSchema)
      .max(5000)
      .optional()
      .meta({ description: 'Filter by monitor IDs' }),
    monitor_types: z
      .array(monitorOptionSchema)
      .max(10)
      .optional()
      .meta({ description: 'Filter by monitor types' }),
    locations: z
      .array(monitorOptionSchema)
      .max(100)
      .optional()
      .meta({ description: 'Filter by monitor locations' }),
  })
  .strict();

export type MonitorFilters = z.output<typeof monitorFiltersSchema>;
