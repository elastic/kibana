/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PanelOpenerChildDefinition } from '@kbn/core-chrome-browser';
import type { CoreStart } from '@kbn/core/public';
import type { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';

export type EntityInventoryEntityCategory = 'all' | 'hosts' | 'kubernetes';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EntityInventoryAppSetupDependencies {}

export interface EntityInventoryAppStartDependencies {
  observabilityShared: ObservabilitySharedPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

export type EntityInventoryAppServices = CoreStart & EntityInventoryAppStartDependencies;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EntityInventoryAppPublicSetup {}

export interface EntityInventoryAppPublicStart {
  navTreeGroup: PanelOpenerChildDefinition;
}
