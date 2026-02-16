/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';

const ConfigurationSchema = schema.object({
  overview_mode: schema.maybe(schema.oneOf([schema.literal('single'), schema.literal('groups')])),
});

const SingleOverviewSchema =  schema.object({
  slo_id: schema.string(),
  slo_instance_id: schema.maybe(schema.string()),
  remote_name: schema.maybe(schema.string()),
  show_all_group_by_instances: schema.maybe(schema.boolean()),
});

export const SingleOverviewEmbeddableSchema = schema.allOf([SingleOverviewSchema, ConfigurationSchema, serializedTitlesSchema], { meta: { description: 'SLO Single Overview embeddable schema' } } );
export const SingleOverviewCustomSchema = schema.allOf([SingleOverviewSchema, ConfigurationSchema]);

const GroupOverviewSchema = schema.object({
  group_filters: schema.maybe(schema.object({
    group_by: schema.oneOf([
      schema.literal('slo.tags'),
      schema.literal('status'),
      schema.literal('slo.indicator.type'),
    ]),
    groups: schema.maybe(schema.arrayOf(schema.string())),
    filters: schema.maybe(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))),
    kql_query: schema.maybe(schema.string()),
  })),
});

export const GroupOverviewEmbeddableSchema = schema.allOf([GroupOverviewSchema, ConfigurationSchema, serializedTitlesSchema], { meta: { description: 'SLO Group Overview embeddable schema' } });
export const GroupOverviewCustomSchema = schema.allOf([GroupOverviewSchema, ConfigurationSchema], { meta: { description: 'SLO Group Overview embeddable schema' } });

export const overviewEmbeddableSchema  = schema.oneOf([SingleOverviewEmbeddableSchema, GroupOverviewEmbeddableSchema], { meta: { description: 'SLO Overview embeddable schema' } });

export type OverviewEmbeddableState = TypeOf<typeof overviewEmbeddableSchema>;

export const legacySingleOverviewEmbeddableCustomSchema = schema.object(
  {
    sloId: schema.string(),
    sloInstanceId: schema.maybe(schema.string()),
    remoteName: schema.maybe(schema.string()),
    overviewMode: schema.literal('single'),
    showAllGroupByInstances: schema.maybe(schema.boolean()),
  }
);

export const legacyGroupOverviewEmbeddableCustomSchema = schema.object(
  {
    overviewMode: schema.literal('groups'),
    groupFilters:
      schema.object({
        groupBy: schema.oneOf([
          schema.literal('slo.tags'),
          schema.literal('status'),
          schema.literal('slo.indicator.type'),
        ]),
        groups: schema.maybe(schema.arrayOf(schema.string())),
        filters: schema.maybe(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))),
        kql_query: schema.maybe(schema.string()),
      })

  }
);

export type LegacySingleOverviewEmbeddableState = TypeOf<typeof legacySingleOverviewEmbeddableCustomSchema>;
export type LegacyGroupOverviewEmbeddableState = TypeOf<typeof legacyGroupOverviewEmbeddableCustomSchema>;