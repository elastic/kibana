/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const EndpointSuggestionsSchema = {
  body: schema.object({
    field: schema.string(),
    query: schema.string(),
    filters: schema.maybe(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))),
    fieldMeta: schema.maybe(schema.any()),
  }),
  params: schema.object({
    suggestion_type: schema.oneOf([schema.literal('eventFilters'), schema.literal('endpoints')]),
  }),
};

export type EndpointSuggestionsBody = TypeOf<typeof EndpointSuggestionsSchema.body>;
