/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

// Longest SLO time window and transform backfill (90d) plus a one day buffer.
export const SLI_MAX_LOOKBACK_DAYS = 91;

export const configSchema = schema.object({
  sloOrphanSummaryCleanUpTaskEnabled: schema.boolean({ defaultValue: true }),
  tempSummaryCleanupTaskEnabled: schema.boolean({ defaultValue: true }),
  healthScanTaskEnabled: schema.boolean({ defaultValue: true }),
  staleInstancesCleanupTaskEnabled: schema.boolean({ defaultValue: false }),
  compositeSloSummaryTaskEnabled: schema.boolean({ defaultValue: true }),
  sliIndexRounding: schema.oneOf([schema.literal('M'), schema.literal('w'), schema.literal('d')], {
    defaultValue: 'M',
  }),
  sliRetentionTaskEnabled: schema.boolean({ defaultValue: true }),
  sliRetentionPeriod: schema.duration({
    defaultValue: '180d',
    validate: (value) => {
      if (value.asDays() < SLI_MAX_LOOKBACK_DAYS) {
        return `must be at least ${SLI_MAX_LOOKBACK_DAYS} days`;
      }
    },
  }),
  enabled: schema.boolean({ defaultValue: true }),
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
