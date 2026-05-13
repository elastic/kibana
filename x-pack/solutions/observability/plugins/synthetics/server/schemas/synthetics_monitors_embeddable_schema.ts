/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import { monitorFiltersSchema } from './common_schemas';

/**
 * Schema for the custom state of the monitors embeddable
 */
const monitorsCustomStateSchema = z.object({
  filters: monitorFiltersSchema.optional(),
  view: z
    .union([z.literal('cardView'), z.literal('compactView')])
    .optional()
    .meta({
      description: 'View mode for the monitors embeddable (defaults to cardView)',
    }),
});

/**
 * Complete schema for the Synthetics Monitors embeddable
 * Combines serialized titles and custom state
 */
export const syntheticsMonitorsEmbeddableSchema = z
  .object({
    ...serializedTitlesSchema.shape,
    ...monitorsCustomStateSchema.shape,
  })
  .meta({
    description: 'Synthetics monitors embeddable schema',
  });

export type OverviewMonitorsEmbeddableState = z.output<typeof syntheticsMonitorsEmbeddableSchema>;
