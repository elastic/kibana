/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ObservabilitySharedPluginSetup } from '@kbn/observability-shared-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';

export interface EntitiesRuntimeCaueSetupDependencies {
  observabilityShared: ObservabilitySharedPluginSetup;
}

export interface EntitiesRuntimeCaueStartDependencies {
  data: DataPublicPluginStart;
  share: SharePluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

export type EntitiesRuntimeCauePublicSetup = Record<string, never>;
export type EntitiesRuntimeCauePublicStart = Record<string, never>;
