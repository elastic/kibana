/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';

export type EntityInventoryEntityType = 'all' | 'hosts' | 'kubernetes';

export interface EntityInventoryAppProps {
  entityType?: EntityInventoryEntityType;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EntityInventoryAppSetupDependencies {}

export interface EntityInventoryAppStartDependencies {
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

export type EntityInventoryAppServices = CoreStart & EntityInventoryAppStartDependencies;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EntityInventoryAppPublicSetup {}

export interface EntityInventoryAppPublicStart {
  getAppComponent: () => React.ComponentType<EntityInventoryAppProps>;
}
