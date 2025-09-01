/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const playgroundAttributesSchema = schema.object({
  name: schema.string({ minLength: 1, maxLength: 50 }),
  // Common fields
  indices: schema.arrayOf(schema.string(), { minSize: 1 }),
  queryFields: schema.recordOf(schema.string(), schema.arrayOf(schema.string(), { minSize: 1 })),
  elasticsearchQueryJSON: schema.string(),
  userElasticsearchQueryJSON: schema.maybe(schema.string()),
  // Chat fields
  prompt: schema.maybe(schema.string()),
  citations: schema.maybe(schema.boolean()),
  context: schema.maybe(
    schema.object({
      sourceFields: schema.recordOf(
        schema.string(),
        schema.arrayOf(schema.string(), { minSize: 1 })
      ),
      docSize: schema.number({ defaultValue: 3, min: 1 }),
    })
  ),
  summarizationModel: schema.maybe(
    schema.object({
      connectorId: schema.string(),
      modelId: schema.maybe(schema.string()),
    })
  ),
});
