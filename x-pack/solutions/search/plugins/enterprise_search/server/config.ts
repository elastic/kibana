/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core/server';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  hasConnectors: schema.boolean({ defaultValue: true }),
  hasDefaultIngestPipeline: schema.boolean({ defaultValue: true }),
  hasDocumentLevelSecurityEnabled: schema.boolean({ defaultValue: true }),
  hasIncrementalSyncEnabled: schema.boolean({ defaultValue: true }),
  hasNativeConnectors: schema.boolean({ defaultValue: true }),
  hasWebCrawler: schema.boolean({ defaultValue: false }),
  ui: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
});

export type ConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ConfigType> = {
  deprecations: ({ unusedFromRoot }) => [
    unusedFromRoot('enterpriseSearch.host', { level: 'critical' }),
    unusedFromRoot('enterpriseSearch.ssl', { level: 'critical' }),
    unusedFromRoot('enterpriseSearch.accessCheckTimeout', { level: 'critical' }),
    unusedFromRoot('enterpriseSearch.accessCheckTimeoutWarning', { level: 'critical' }),
    unusedFromRoot('enterpriseSearch.customHeaders', { level: 'critical' }),
    unusedFromRoot('enterpriseSearch.isCloud', { level: 'warning' }),
  ],
  exposeToBrowser: {
    ui: true,
  },
  schema: configSchema,
};
