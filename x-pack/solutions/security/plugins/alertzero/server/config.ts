/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  // Demo default: this branch (`plan7-demo-integration`) stages a combined demo build for a
  // deployment target where `kibana.dev.yml` isn't reachable, so the flag defaults on here
  // instead. Revert to `false` before this branch's changes are folded into a real PR.
  enabled: schema.boolean({ defaultValue: true }),
});

export type AlertZeroConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<AlertZeroConfig> = {
  exposeToBrowser: {
    enabled: true,
  },
  schema: configSchema,
};
