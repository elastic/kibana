/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf, offeringBasedSchema, schema } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core-plugins-server';

const configSchema = schema.object({
  ui: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
  serverless: schema.object({
    enabled: offeringBasedSchema({
      serverless: schema.literal(true),
      options: { defaultValue: schema.contextRef('serverless') },
    }),
  }),
});

export type ObservabilityOnboardingConfig = TypeOf<typeof configSchema>;

// plugin config
export const config: PluginConfigDescriptor<ObservabilityOnboardingConfig> = {
  exposeToBrowser: {
    ui: true,
    serverless: true,
  },
  schema: configSchema,
  deprecations: ({ unused }) => [
    unused('ui.enabled', { level: 'warning' }),
    unused('serverless.enabled', { level: 'warning' }),
  ],
};
