/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core-plugins-server';

export const configSchema = schema.object({
  // Core skips loading the plugin entirely when this is false, so nothing below runs on a
  // deployment that did not opt in.
  enabled: schema.boolean({ defaultValue: false }),
});

export type NightshiftDetectionConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<NightshiftDetectionConfig> = {
  schema: configSchema,
};
