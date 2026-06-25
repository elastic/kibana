/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import type { GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import { monitorFiltersSchema } from './common_schemas';
import { SYNTHETICS_STATS_SUPPORTED_TRIGGERS } from '../../common/embeddables/stats_overview/constants';

/**
 * Schema for the custom state of the stats overview embeddable
 */
export const statsOverviewCustomStateSchema = schema.object({
  filters: schema.maybe(monitorFiltersSchema),
});

/**
 * Complete schema for the Synthetics Stats Overview embeddable
 */
export function getStatsOverviewEmbeddableSchema(getDrilldownsSchema: GetDrilldownsSchemaFnType) {
  return schema.allOf(
    [
      serializedTitlesSchema,
      getDrilldownsSchema(SYNTHETICS_STATS_SUPPORTED_TRIGGERS),
      statsOverviewCustomStateSchema,
    ],
    {
      meta: {
        description: 'Synthetics stats overview embeddable schema',
      },
    }
  );
}

export type OverviewStatsEmbeddableState = TypeOf<
  ReturnType<typeof getStatsOverviewEmbeddableSchema>
>;
export type OverviewStatsEmbeddableCustomState = TypeOf<typeof statsOverviewCustomStateSchema>;
