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
 * Schema for the custom state of the stats overview embeddable
 */
export const statsOverviewCustomStateSchema = schema.object({
  filters: schema.maybe(monitorFiltersSchema),
});

/**
 * Complete schema for the Synthetics Stats Overview embeddable
 * Combines serialized titles and custom state
 */
export const syntheticsStatsOverviewEmbeddableSchema = schema.allOf(
  [statsOverviewCustomStateSchema, serializedTitlesSchema],
  {
    meta: {
      description: 'Synthetics stats overview embeddable schema',
    },
  }
);

export type SyntheticsStatsOverviewEmbeddableState = TypeOf<
  typeof syntheticsStatsOverviewEmbeddableSchema
>;
