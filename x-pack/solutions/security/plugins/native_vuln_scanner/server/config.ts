/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

export const configSchema = schema.object({
  /**
   * Off by default while the scanner is experimental. When false the plugin registers nothing:
   * no task, no routes, no index templates.
   */
  enabled: schema.boolean({ defaultValue: false }),
});

export type NativeVulnScannerConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<NativeVulnScannerConfig> = {
  schema: configSchema,
};
