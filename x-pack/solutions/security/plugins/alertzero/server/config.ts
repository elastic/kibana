/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  /**
   * Deployment-level kill switch for AlertZero's startup side effects: managed-workflow ownership,
   * the global managed workflows, inference features, the default-space agent, and the Kibana
   * feature privileges. Turning it off and restarting is what triggers orphan cleanup. The
   * user-facing per-space gate is the `securitySolution:enableAlertZero` advanced setting.
   */
  enabled: schema.boolean({ defaultValue: false }),
  ui: schema.object({
    useMockData: schema.boolean({ defaultValue: false }),
  }),
});

export type AlertZeroConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<AlertZeroConfig> = {
  exposeToBrowser: {
    enabled: true,
    ui: true,
  },
  schema: configSchema,
};
