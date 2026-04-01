/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import { monitorFiltersSchema } from './common_schemas';

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

export type OverviewMonitorsEmbeddableState = TypeOf<typeof syntheticsMonitorsEmbeddableSchema>;
