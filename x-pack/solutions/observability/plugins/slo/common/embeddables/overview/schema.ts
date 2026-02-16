/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { Filter } from '@kbn/es-query';

export const SingleOverviewCustomSchema = schema.object({
  slo_id: schema.string(),
  slo_instance_id: schema.maybe(schema.string()),
  remote_name: schema.maybe(schema.string()),
  show_all_group_by_instances: schema.maybe(schema.boolean()),
  overview_mode: schema.literal('single'),
});

export const GroupOverviewCustomSchema = schema.object({
  group_filters: schema.maybe(
    schema.object({
      group_by: schema.oneOf([
        schema.literal('slo.tags'),
        schema.literal('status'),
        schema.literal('slo.indicator.type'),
      ]),
      groups: schema.maybe(schema.arrayOf(schema.string())),
      filters: schema.maybe(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))),
      kql_query: schema.maybe(schema.string()),
    })
  ),
  overview_mode: schema.literal('groups'),
});

export const legacySingleOverviewEmbeddableCustomSchema = schema.object({
  sloId: schema.string(),
  sloInstanceId: schema.maybe(schema.string()),
  remoteName: schema.maybe(schema.string()),
  overviewMode: schema.literal('single'),
  showAllGroupByInstances: schema.maybe(schema.boolean()),
});

export const legacyGroupOverviewEmbeddableCustomSchema = schema.object({
  overviewMode: schema.literal('groups'),
  groupFilters: schema.object({
    groupBy: schema.oneOf([
      schema.literal('slo.tags'),
      schema.literal('status'),
      schema.literal('slo.indicator.type'),
    ]),
    groups: schema.maybe(schema.arrayOf(schema.string())),
    filters: schema.maybe(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))),
    kqlQuery: schema.maybe(schema.string()),
  }),
});

export type LegacySingleOverviewEmbeddableState = TypeOf<
  typeof legacySingleOverviewEmbeddableCustomSchema
>;
export type LegacyGroupOverviewEmbeddableState = TypeOf<
  typeof legacyGroupOverviewEmbeddableCustomSchema
>;

export type SingleOverviewCustomState = TypeOf<typeof SingleOverviewCustomSchema>;

export type GroupOverviewCustomState = Omit<
  TypeOf<typeof GroupOverviewCustomSchema>,
  'group_filters'
> & {
  group_filters?: {
    group_by: 'slo.tags' | 'status' | 'slo.indicator.type';
    groups?: string[];
    filters?: Filter[];
    kql_query?: string;
  };
};
