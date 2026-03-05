/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { ALL_VALUE } from '@kbn/slo-schema';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import { asCodeFilterSchema } from '@kbn/as-code-filters-schema';
import { SLO_EMBEDDABLE_SUPPORTED_TRIGGERS } from '../../../common/embeddables/overview/constants';

const SingleOverviewCustomSchema = schema.object({
  slo_id: schema.string({
    meta: { description: 'The ID of the SLO' },
  }),
  slo_instance_id: schema.string({
    defaultValue: ALL_VALUE,
    meta: {
      description:
        'ID of the SLO instance. Set when the SLO uses group_by; identifies which instance to show. Defaults to * (all instances).',
    },
  }),
  remote_name: schema.maybe(
    schema.string({
      meta: { description: 'The name of the remote SLO' },
    })
  ),
  overview_mode: schema.literal('single'),
});

const groupBySchema = schema.oneOf([
  schema.literal('slo.tags'),
  schema.literal('status'),
  schema.literal('slo.indicator.type'),
]);

const GroupOverviewCustomSchema = schema.object({
  group_filters: schema.maybe(
    schema.object({
      group_by: schema.maybe(groupBySchema),
      // Bounded to avoid unbounded-array warnings; 100 aligns with other embeddable list limits.
      groups: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
      // Bounded to avoid unbounded-array warnings; 500 matches dashboard filters limit.
      filters: schema.maybe(schema.arrayOf(asCodeFilterSchema, { maxSize: 500 })),
      kql_query: schema.maybe(schema.string()),
    })
  ),
  overview_mode: schema.literal('groups'),
});

function getSingleOverviewEmbeddableSchema(getDrilldownsSchema: GetDrilldownsSchemaFnType) {
  return schema.object(
    {
      ...SingleOverviewCustomSchema.getPropSchemas(),
      ...getDrilldownsSchema(SLO_EMBEDDABLE_SUPPORTED_TRIGGERS).getPropSchemas(),
      ...serializedTitlesSchema.getPropSchemas(),
    },
    {
      meta: {
        id: 'slo-single-overview-embeddable',
        description: 'SLO Single Overview embeddable schema',
      },
    }
  );
}

function getGroupOverviewEmbeddableSchema(getDrilldownsSchema: GetDrilldownsSchemaFnType) {
  return schema.object(
    {
      ...GroupOverviewCustomSchema.getPropSchemas(),
      ...getDrilldownsSchema(SLO_EMBEDDABLE_SUPPORTED_TRIGGERS).getPropSchemas(),
      ...serializedTitlesSchema.getPropSchemas(),
    },
    {
      meta: {
        id: 'slo-group-overview-embeddable',
        description: 'SLO Group Overview embeddable schema',
      },
    }
  );
}

export const getOverviewEmbeddableSchema = (getDrilldownsSchema: GetDrilldownsSchemaFnType) => {
  return schema.discriminatedUnion(
    'overview_mode',
    [
      getSingleOverviewEmbeddableSchema(getDrilldownsSchema),
      getGroupOverviewEmbeddableSchema(getDrilldownsSchema),
    ],
    { meta: { description: 'SLO Overview embeddable schema' } }
  );
};

export type GroupBy = TypeOf<typeof groupBySchema>;
export type SingleOverviewCustomState = TypeOf<typeof SingleOverviewCustomSchema>;
export type GroupOverviewCustomState = TypeOf<typeof GroupOverviewCustomSchema>;
export type OverviewMode =
  | SingleOverviewCustomState['overview_mode']
  | GroupOverviewCustomState['overview_mode'];
export type GroupFilters = Required<GroupOverviewCustomState>['group_filters'];
export type OverviewEmbeddableState = TypeOf<ReturnType<typeof getOverviewEmbeddableSchema>>;
export type SingleOverviewEmbeddableState = TypeOf<
  ReturnType<typeof getSingleOverviewEmbeddableSchema>
>;
export type GroupOverviewEmbeddableState = TypeOf<
  ReturnType<typeof getGroupOverviewEmbeddableSchema>
>;
