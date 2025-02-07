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
});

export type ConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ConfigType> = {
  deprecations: ({ renameFromRoot }) => [
    renameFromRoot('enterpriseSearch.enabled', 'xpack.search.enabled', { level: 'critical' }),
    renameFromRoot('enterpriseSearch.hasConnectors', 'xpack.search.hasConnectors', {
      level: 'critical',
    }),
    renameFromRoot(
      'enterpriseSearch.hasDefaultIngestPipeline',
      'xpack.search.hasDefaultIngestPipeline',
      {
        level: 'critical',
      }
    ),
    renameFromRoot(
      'enterpriseSearch.hasDocumentLevelSecurityEnabled',
      'xpack.search.hasDocumentLevelSecurityEnabled',
      {
        level: 'critical',
      }
    ),
    renameFromRoot(
      'enterpriseSearch.hasIncrementalSyncEnabled',
      'xpack.search.hasIncrementalSyncEnabled',
      {
        level: 'critical',
      }
    ),
    renameFromRoot('enterpriseSearch.hasNativeConnectors', 'xpack.search.hasNativeConnectors', {
      level: 'critical',
    }),
    renameFromRoot('enterpriseSearch.hasWebCrawler', 'xpack.search.hasWebCrawler', {
      level: 'critical',
    }),
  ],
  schema: configSchema,
};
