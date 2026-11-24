/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import {
  SLI_RETENTION_DEFAULT_PERIOD_DAYS,
  SLI_RETENTION_MAX_PERIOD_DAYS,
  SLI_RETENTION_MIN_PERIOD_DAYS,
} from '@kbn/slo-constants';

export const configSchema = schema.object({
  sloOrphanSummaryCleanUpTaskEnabled: schema.boolean({ defaultValue: true }),
  tempSummaryCleanupTaskEnabled: schema.boolean({ defaultValue: true }),
  healthScanTaskEnabled: schema.boolean({ defaultValue: true }),
  staleInstancesCleanupTaskEnabled: schema.boolean({ defaultValue: false }),
  compositeSloSummaryTaskEnabled: schema.boolean({ defaultValue: true }),
  enabled: schema.boolean({ defaultValue: true }),
  sliRetention: schema.maybe(
    schema.object({
      enabled: schema.boolean(),
      periodDays: schema.number({
        min: SLI_RETENTION_MIN_PERIOD_DAYS,
        max: SLI_RETENTION_MAX_PERIOD_DAYS,
        defaultValue: SLI_RETENTION_DEFAULT_PERIOD_DAYS,
        validate: (value) => (Number.isInteger(value) ? undefined : 'must be an integer'),
      }),
    })
  ),
  experimental: schema.maybe(
    schema.object({
      ruleFormV2: schema.object({
        enabled: schema.boolean({ defaultValue: false }),
      }),
    })
  ),
});

export const config = {
  schema: configSchema,
  exposeToBrowser: {
    experimental: true,
  },
};
export type SLOConfig = TypeOf<typeof configSchema>;
export type ExperimentalFeatures = SLOConfig['experimental'];
