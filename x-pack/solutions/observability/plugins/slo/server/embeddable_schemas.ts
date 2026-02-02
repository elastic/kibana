/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import { schema } from '@kbn/config-schema';

export const sloOverviewEmbeddableSchema = schema.allOf(
  [
    schema.object({
      slo_id: schema.maybe(schema.string()),
      slo_instance_id: schema.maybe(schema.string()),
      show_all_group_by_instances: schema.maybe(schema.boolean()),
      remote_name: schema.maybe(schema.string()),
      overview_mode: schema.maybe(
        schema.oneOf([schema.literal('single'), schema.literal('groups')])
      ),
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
    }),
    serializedTitlesSchema,
  ],
  {
    meta: {
      description: 'SLO overview embeddable schema',
    },
  }
);

export type SloOverviewConfig = TypeOf<typeof sloOverviewEmbeddableSchema>;
