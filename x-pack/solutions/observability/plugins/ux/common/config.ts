/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

const esTimeValue = schema.string({
  defaultValue: '5m',
  minLength: 2,
  maxLength: 8,
  validate: (value: string) => {
    if (!/^[1-9]\d*[smh]$/.test(value)) {
      return 'must be a positive Elasticsearch time value such as 5m, 30s, or 1h';
    }
  },
});

const uxConfig = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  sessionAnalytics: schema.object({
    /** How long session and daily transforms wait before a checkpoint is "settled". */
    syncDelay: esTimeValue,
  }),
});

export const config: PluginConfigDescriptor<UXConfig> = {
  schema: uxConfig,
};

export type UXConfig = TypeOf<typeof uxConfig>;
