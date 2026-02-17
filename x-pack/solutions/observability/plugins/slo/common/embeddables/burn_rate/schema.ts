/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const BurnRateCustomSchema = schema.object({
  slo_id: schema.string(),
  slo_instance_id: schema.maybe(schema.string()),
  duration: schema.string(),
});

export const legacyBurnRateEmbeddableCustomSchema = schema.object({
  sloId: schema.string(),
  sloInstanceId: schema.maybe(schema.string()),
  duration: schema.string(),
});

export type LegacyBurnRateEmbeddableState = TypeOf<
  typeof legacyBurnRateEmbeddableCustomSchema
>;

export type BurnRateCustomState = TypeOf<typeof BurnRateCustomSchema>;
