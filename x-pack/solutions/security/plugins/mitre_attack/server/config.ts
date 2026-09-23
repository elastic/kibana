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
   * Gates the whole managed MITRE data source. While false the plugin registers no Saved
   * Object type, runs no population and exposes no data client, so a deployment carries no
   * MITRE footprint at all and consumers fall back to the legacy blob in `security_solution`.
   * Flipping this default to true is the enablement step tracked by
   * https://github.com/elastic/security-team/issues/19076.
   */
  managedSourceEnabled: schema.boolean({ defaultValue: false }),
});

export type MitreAttackConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<MitreAttackConfig> = {
  schema: configSchema,
  // Exposed to the browser so the public start contract can report the flag as `isEnabled`,
  // letting UI code pick between this data source and the legacy blob without a second flag.
  exposeToBrowser: { managedSourceEnabled: true },
};
