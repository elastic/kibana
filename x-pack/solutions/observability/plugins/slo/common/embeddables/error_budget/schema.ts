/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const ErrorBudgetCustomSchema = schema.object({
  slo_id: schema.maybe(schema.string()),
  slo_instance_id: schema.maybe(schema.string()),
});

export const legacyErrorBudgetEmbeddableCustomSchema = schema.object({
  sloId: schema.maybe(schema.string()),
  sloInstanceId: schema.maybe(schema.string()),
});

export type LegacyErrorBudgetEmbeddableState = TypeOf<
  typeof legacyErrorBudgetEmbeddableCustomSchema
>;

export type ErrorBudgetCustomState = TypeOf<typeof ErrorBudgetCustomSchema>;
