/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import { z } from '@kbn/zod';
import { ALL_VALUE } from '@kbn/slo-schema';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import { asCodeFilterSchema } from '@kbn/as-code-filters-schema';
import { SLO_EMBEDDABLE_SUPPORTED_TRIGGERS } from '../../../common/embeddables/overview/constants';

const SingleOverviewCustomSchema = z
  .object({
    slo_id: z.string().meta({
      description: 'The ID of the SLO',
    }),
    slo_instance_id: z.string().default(ALL_VALUE).meta({
      description:
        'ID of the SLO instance. Set when the SLO uses group_by; identifies which instance to show. Defaults to * (all instances).',
    }),
    remote_name: z.string().optional().meta({ description: 'The name of the remote SLO' }),
    overview_mode: z.literal('single'),
  })
  .strict();

const groupBySchema = z
  .union([
    z.literal('slo.tags'),
    z.literal('status'),
    z.literal('slo.indicator.type'),
    z.literal('_index'), // remote cluster
  ])
  .default('status');

const GroupOverviewCustomSchema = z
  .object({
    group_filters: z
      .object({
        group_by: groupBySchema,
        // Bounded to avoid unbounded-array warnings; 100 aligns with other embeddable list limits.
        groups: z.array(z.string()).max(100).optional(),
        // Bounded to avoid unbounded-array warnings; 500 matches dashboard filters limit.
        filters: z.array(asCodeFilterSchema).max(500).optional(),
        kql_query: z.string().optional(),
      })
      .strict()
      .default({ group_by: 'status' }),
    overview_mode: z.literal('groups'),
  })
  .strict();

function getSingleOverviewEmbeddableSchema(getDrilldownsSchema: GetDrilldownsSchemaFnType) {
  return z
    .object({
      ...SingleOverviewCustomSchema.shape,
      ...getDrilldownsSchema(SLO_EMBEDDABLE_SUPPORTED_TRIGGERS).shape,
      ...serializedTitlesSchema.shape,
    })
    .strict()
    .meta({
      id: 'slo-single-overview-embeddable',
      description: 'SLO Single Overview embeddable schema',
    });
}

function getGroupOverviewEmbeddableSchema(getDrilldownsSchema: GetDrilldownsSchemaFnType) {
  return z
    .object({
      ...GroupOverviewCustomSchema.shape,
      ...getDrilldownsSchema(SLO_EMBEDDABLE_SUPPORTED_TRIGGERS).shape,
      ...serializedTitlesSchema.shape,
    })
    .strict()
    .meta({
      id: 'slo-group-overview-embeddable',
      description: 'SLO Group Overview embeddable schema',
    });
}

export const getOverviewEmbeddableSchema = (getDrilldownsSchema: GetDrilldownsSchemaFnType) => {
  return z
    .discriminatedUnion('overview_mode', [
      getSingleOverviewEmbeddableSchema(getDrilldownsSchema),
      getGroupOverviewEmbeddableSchema(getDrilldownsSchema),
    ])
    .meta({ description: 'SLO Overview embeddable schema' });
};

export type GroupBy = z.output<typeof groupBySchema>;
export type SingleOverviewCustomState = z.output<typeof SingleOverviewCustomSchema>;
export type GroupOverviewCustomState = z.output<typeof GroupOverviewCustomSchema>;
export type OverviewMode =
  | SingleOverviewCustomState['overview_mode']
  | GroupOverviewCustomState['overview_mode'];
export type GroupFilters = GroupOverviewCustomState['group_filters'];
export type OverviewEmbeddableState = z.output<ReturnType<typeof getOverviewEmbeddableSchema>>;
export type SingleOverviewEmbeddableState = z.output<
  ReturnType<typeof getSingleOverviewEmbeddableSchema>
>;
export type GroupOverviewEmbeddableState = z.output<
  ReturnType<typeof getGroupOverviewEmbeddableSchema>
>;
