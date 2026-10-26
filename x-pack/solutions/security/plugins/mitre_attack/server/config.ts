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
   * Gates the whole managed MITRE data source. Enabled by default. Setting this to false
   * makes the plugin register no Saved Object type, run no population and expose no data
   * client, so consumers in `security_solution` fall back to the legacy
   * `mitre_tactics_techniques.ts` blob. The legacy blob and this flag are scheduled for
   * removal once the cutover is confirmed (https://github.com/elastic/security-team/issues/19076).
   */
  managedSourceEnabled: schema.boolean({ defaultValue: true }),
});

export type MitreAttackConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<MitreAttackConfig> = {
  schema: configSchema,
  // Exposed to the browser so the public start contract can report the flag as `isEnabled`,
  // letting UI code pick between this data source and the legacy blob without a second flag.
  exposeToBrowser: { managedSourceEnabled: true },
};
