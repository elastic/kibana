/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { AppDeepLink } from '@kbn/core/public';
import type { NodeDefinition } from '@kbn/core-chrome-browser';
import type { NavigationEntry } from '@kbn/observability-shared-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EntityInventoryAppSetupDependencies {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EntityInventoryAppStartDependencies {}

export interface EntityInventoryAppPublicSetup {
  showEntityInventory: boolean;
  deepLinks: AppDeepLink[];
  navEntries: NavigationEntry[];
}

export interface EntityInventoryAppPublicStart {
  getAppComponent: () => React.ComponentType;
  showEntityInventory: boolean;
  navTreeChildren: NodeDefinition[];
}
