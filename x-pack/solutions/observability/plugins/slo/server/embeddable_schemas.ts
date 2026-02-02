/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import { schema } from '@kbn/config-schema';

const sloOverviewStateSchema = schema.object(
  {
    slo_id: schema.maybe(schema.string()), // slo_id is optional, it's required when overview_mode is 'single'
    slo_instance_id: schema.maybe(schema.string()),
    remote_name: schema.maybe(schema.string()),
    overview_mode: schema.maybe(schema.oneOf([schema.literal('single'), schema.literal('groups')])),
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
  },
  {
    validate: (value) => {
      // Require slo_id when overview_mode is 'single'
      if (value.overview_mode === 'single' && !value.slo_id) {
        return 'slo_id is required when overview_mode is "single"';
      }
      // Require group_filters when overview_mode is 'groups'
      if (value.overview_mode === 'groups' && !value.group_filters) {
        return 'group_filters is required when overview_mode is "groups"';
      }
    },
  }
);

export const sloOverviewEmbeddableSchema = schema.allOf(
  [sloOverviewStateSchema, serializedTitlesSchema],
  {
    meta: {
      description: 'SLO overview embeddable schema',
    },
  }
);

export type SloOverviewConfig = TypeOf<typeof sloOverviewEmbeddableSchema>;

const sloAlertsStateSchema = schema.object({
  slos: schema.arrayOf(
    schema.object({
      id: schema.string(),
      instance_id: schema.string(),
      name: schema.string(),
      group_by: schema.string(),
    }),
    { defaultValue: [] }
  ),
  show_all_group_by_instances: schema.maybe(schema.boolean()),
});

export const sloAlertsEmbeddableSchema = schema.allOf(
  [sloAlertsStateSchema, serializedTitlesSchema],
  {
    meta: {
      description: 'SLO alerts embeddable schema',
    },
  }
);

export type SloAlertsConfig = TypeOf<typeof sloAlertsEmbeddableSchema>;
