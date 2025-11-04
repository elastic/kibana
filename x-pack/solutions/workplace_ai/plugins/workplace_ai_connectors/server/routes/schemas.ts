/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const createConnectorRequestSchema = schema.object({
  name: schema.string({ minLength: 1 }),
  type: schema.string({ minLength: 1 }),
  config: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  secrets: schema.recordOf(schema.string(), schema.any()),
  features: schema.maybe(schema.arrayOf(schema.string({ minLength: 1 }))),
});

export const updateConnectorRequestSchema = schema.object({
  name: schema.maybe(schema.string({ minLength: 1 })),
  config: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  secrets: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  features: schema.maybe(schema.arrayOf(schema.string({ minLength: 1 }))),
});

export const connectorIdSchema = schema.object({
  id: schema.string(),
});
