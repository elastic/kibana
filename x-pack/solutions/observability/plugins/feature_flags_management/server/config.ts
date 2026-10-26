/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  observedContexts: schema.object({
    retention: schema.duration({ defaultValue: '30d' }),
  }),
});

export type FeatureFlagsManagementConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<FeatureFlagsManagementConfig> = {
  schema: configSchema,
};
