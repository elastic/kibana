/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core-plugins-server';

const configSchema = schema.object({
  visibilityEnabled: schema.boolean({ defaultValue: true }),
  spacesEnabled: schema.boolean({ defaultValue: true }),
  logSourcesEnabled: schema.boolean({ defaultValue: true }),
});

export type ObservabilityAIAssistantManagementConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ObservabilityAIAssistantManagementConfig> = {
  schema: configSchema,
  exposeToBrowser: { logSourcesEnabled: true, spacesEnabled: true, visibilityEnabled: true },
};
