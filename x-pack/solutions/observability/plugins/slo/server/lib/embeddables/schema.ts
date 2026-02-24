/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import type { ObjectType } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import { asCodeFilterSchema } from '@kbn/as-code-filters-schema';

/** Triggers supported by the SLO overview embeddable for drilldowns */
export const SLO_OVERVIEW_EMBEDDABLE_SUPPORTED_TRIGGERS = ['VALUE_CLICK_TRIGGER'];

export const SingleOverviewCustomSchema = schema.object({
  slo_id: schema.string({
    meta: { description: 'The ID of the SLO' },
  }),
  slo_instance_id: schema.maybe(
    schema.string({
      meta: {
        description:
          'ID of the SLO instance. Set when the SLO uses group_by; identifies which instance to show. SLOs without group_by have * as the instance ID.',
      },
    })
  ),
  remote_name: schema.maybe(
    schema.string({
      meta: { description: 'The name of the remote SLO' },
    })
  ),
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
      filters: schema.maybe(schema.arrayOf(asCodeFilterSchema)),
      kql_query: schema.maybe(schema.string()),
    })
  ),
  overview_mode: schema.literal('groups'),
});

export const SingleOverviewEmbeddableSchema = schema.allOf(
  [SingleOverviewCustomSchema, serializedTitlesSchema],
  { meta: { description: 'SLO Single Overview embeddable schema' } }
);

export const GroupOverviewEmbeddableSchema = schema.allOf(
  [GroupOverviewCustomSchema, serializedTitlesSchema],
  { meta: { description: 'SLO Group Overview embeddable schema' } }
);

const overviewEmbeddableSchemaBase = schema.oneOf(
  [SingleOverviewEmbeddableSchema, GroupOverviewEmbeddableSchema],
  { meta: { description: 'SLO Overview embeddable schema' } }
);

export const overviewEmbeddableSchema = overviewEmbeddableSchemaBase;

/**
 * Permissive drilldowns schema that accepts both client format (triggers array) and
 * server format (trigger string), avoiding "expected value to equal [VALUE_CLICK_TRIGGER]"
 * when the client sends a different shape or trigger id.
 */
const permissiveDrilldownsSchema = schema.object({
  drilldowns: schema.maybe(
    schema.arrayOf(schema.object({}, { unknowns: 'allow' }), { maxSize: 100 })
  ),
});

/** Schema that includes drilldowns so dashboard save does not fail with "definition for this key is missing" */
export const getOverviewEmbeddableSchema = (_getDrilldownsSchema: GetDrilldownsSchemaFnType) => {
  return schema.oneOf(
    [
      schema.allOf([
        permissiveDrilldownsSchema,
        SingleOverviewEmbeddableSchema as unknown as ObjectType,
      ]),
      schema.allOf([
        permissiveDrilldownsSchema,
        GroupOverviewEmbeddableSchema as unknown as ObjectType,
      ]),
    ],
    { meta: { description: 'SLO Overview embeddable schema with drilldowns' } }
  );
};

/** Derived from SingleOverviewCustomSchema - use for type-only imports from common/public */
export type SingleOverviewCustomState = TypeOf<typeof SingleOverviewCustomSchema>;
/** Derived from GroupOverviewCustomSchema - use for type-only imports from common/public */
export type GroupOverviewCustomState = TypeOf<typeof GroupOverviewCustomSchema>;

export type OverviewEmbeddableState = TypeOf<typeof overviewEmbeddableSchema>;
export type SingleOverviewEmbeddableState = TypeOf<typeof SingleOverviewEmbeddableSchema>;
export type GroupOverviewEmbeddableState = TypeOf<typeof GroupOverviewEmbeddableSchema>;
