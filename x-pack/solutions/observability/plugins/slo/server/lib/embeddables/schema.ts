/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import {
  SingleOverviewCustomSchema,
  GroupOverviewCustomSchema,
} from '../../../common/embeddables/overview/schema';

export const SingleOverviewEmbeddableSchema = schema.allOf(
  [SingleOverviewCustomSchema, serializedTitlesSchema],
  { meta: { description: 'SLO Single Overview embeddable schema' } }
);

export const GroupOverviewEmbeddableSchema = schema.allOf(
  [GroupOverviewCustomSchema, serializedTitlesSchema],
  { meta: { description: 'SLO Group Overview embeddable schema' } }
);

export const overviewEmbeddableSchema = schema.oneOf(
  [SingleOverviewEmbeddableSchema, GroupOverviewEmbeddableSchema],
  { meta: { description: 'SLO Overview embeddable schema' } }
);

export type OverviewEmbeddableState = TypeOf<typeof overviewEmbeddableSchema>;
export type SingleOverviewEmbeddableState = TypeOf<typeof SingleOverviewEmbeddableSchema>;
export type GroupOverviewEmbeddableState = TypeOf<typeof GroupOverviewEmbeddableSchema>;
