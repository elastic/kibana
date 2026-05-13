/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import type { GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import { monitorFiltersSchema } from './common_schemas';
import { SYNTHETICS_STATS_SUPPORTED_TRIGGERS } from '../../common/embeddables/stats_overview/constants';

/**
 * Schema for the custom state of the stats overview embeddable
 */
export const statsOverviewCustomStateSchema = z.object({
  filters: monitorFiltersSchema.optional(),
});

/**
 * Complete schema for the Synthetics Stats Overview embeddable
 */
export function getStatsOverviewEmbeddableSchema(getDrilldownsSchema: GetDrilldownsSchemaFnType) {
  return z
    .object({
      ...serializedTitlesSchema.shape,
      ...getDrilldownsSchema(SYNTHETICS_STATS_SUPPORTED_TRIGGERS).shape,
      ...statsOverviewCustomStateSchema.shape,
    })
    .meta({
      description: 'Synthetics stats overview embeddable schema',
    });
}

export type OverviewStatsEmbeddableState = z.output<
  ReturnType<typeof getStatsOverviewEmbeddableSchema>
>;
export type OverviewStatsEmbeddableCustomState = z.output<typeof statsOverviewCustomStateSchema>;
