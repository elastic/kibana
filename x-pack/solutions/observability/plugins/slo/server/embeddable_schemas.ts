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
      slo_id: schema.string(),
      slo_instance_id: schema.string(),
      show_all_group_by_instances: schema.boolean(),
      remote_name: schema.maybe(schema.string()),
      overview_mode: schema.maybe(
        schema.oneOf([schema.literal('single'), schema.literal('groups')])
      ),
      group_filters: schema.maybe(schema.arrayOf(schema.string())),
    }),
    serializedTitlesSchema,
  ],
  {
    meta: {
      description: 'SLO overview embeddable schema',
    },
  }
);

// TODO - snake_caseify all of these schemas

export type SloOverviewConfig = TypeOf<typeof sloOverviewEmbeddableSchema>;
