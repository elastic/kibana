/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { SearchNavigationPluginStart } from '@kbn/search-navigation/public';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchGettingStartedPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchGettingStartedPluginStart {}

export interface SearchGettingStartedAppPluginStartDependencies {
  console?: ConsolePluginStart;
  usageCollection?: UsageCollectionStart;
  cloud?: CloudStart;
  searchNavigation?: SearchNavigationPluginStart;
  serverless?: ServerlessPluginStart;
  share: SharePluginStart;
}

export type SearchGettingStartedServicesContextDeps =
  SearchGettingStartedAppPluginStartDependencies & {
    history: AppMountParameters['history'];
    usageCollection?: UsageCollectionStart;
  };

export type SearchGettingStartedServicesContext = CoreStart &
  SearchGettingStartedAppPluginStartDependencies & {
    history: AppMountParameters['history'];
  };

export interface AppUsageTracker {
  click: (eventName: string | string[]) => void;
  count: (eventName: string | string[]) => void;
  load: (eventName: string | string[]) => void;
}
