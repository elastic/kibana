/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
import type { ObservabilityLogsExplorerConfig } from '../common';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
});

export const config: PluginConfigDescriptor<ObservabilityLogsExplorerConfig> = {
  schema: configSchema,
  deprecations: ({ unusedFromRoot, renameFromRoot, unused }) => [
    unusedFromRoot('xpack.discoverLogExplorer.featureFlags.deepLinkVisible', { level: 'warning' }),
    unusedFromRoot('xpack.observabilityLogExplorer.navigation.showAppLink', { level: 'warning' }),
    renameFromRoot(
      'xpack.observabilityLogExplorer.enabled',
      'xpack.observabilityLogsExplorer.enabled',
      { level: 'warning' }
    ),
    unused('navigation.showAppLink', { level: 'warning' }),
  ],
};
