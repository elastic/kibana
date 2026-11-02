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
  /** Hunt Library POC settings. Not exposed to the browser. */
  huntLibrary: schema.object({
    /**
     * Secret key for occurrence-group identity. Set it through the Kibana keystore as
     * `xpack.alertzero.huntLibrary.fingerprintKey`. Without it the Library Hunt worker cannot be
     * enabled and no sweep runs; manual hunts are unaffected. The key must stay fixed during POC
     * evaluation.
     */
    fingerprintKey: schema.maybe(schema.string({ minLength: 32, maxLength: 512 })),
    /** Non-secret label recorded with results produced under the key. */
    fingerprintKeyVersion: schema.string({
      defaultValue: 'v1',
      minLength: 1,
      maxLength: 32,
      validate: (value) =>
        /^[a-z0-9][a-z0-9_.-]*$/.test(value)
          ? undefined
          : 'must be lower-case letters, digits, "_", "." or "-"',
    }),
  }),
});

export type AlertZeroConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<AlertZeroConfig> = {
  exposeToBrowser: {
    enabled: true,
  },
  schema: configSchema,
};
