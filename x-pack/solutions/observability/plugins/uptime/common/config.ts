/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import { schema, TypeOf } from '@kbn/config-schema';

const uptimeConfig = schema.object({
  index: schema.maybe(schema.string()),
  enabled: schema.boolean({ defaultValue: true }),
  experimental: schema.maybe(
    schema.object({
      ruleFormV2Enabled: schema.maybe(schema.boolean({ defaultValue: false })),
    })
  ),
});

export const config: PluginConfigDescriptor = {
  schema: uptimeConfig,
  exposeToBrowser: {
    experimental: true,
  },
};

export type UptimeConfig = TypeOf<typeof uptimeConfig>;
export type ExperimentalFeatures = UptimeConfig['experimental'];
