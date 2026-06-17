/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core-plugins-server';

const configSchema = schema.object({
  synthtrace: schema.object({
    kibanaUrl: schema.string({ defaultValue: 'http://localhost:5601' }),
    username: schema.string({ defaultValue: 'elastic' }),
    password: schema.string({ defaultValue: 'changeme' }),
    apiKey: schema.maybe(schema.string()),
  }),
});

export type ObservabilityDemoDataConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ObservabilityDemoDataConfig> = {
  schema: configSchema,
};
