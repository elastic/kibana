/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { SearchNavigationPluginStart } from '@kbn/search-navigation/public';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';

export interface SearchGettingStartedAppInfo {
  appRoute: string;
  id: string;
  title: string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchGettingStartedPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchGettingStartedPluginStart {}

export interface SearchGettingStartedAppPluginStartDependencies {
  console?: ConsolePluginStart;
  share: SharePluginStart;
  usageCollection?: UsageCollectionStart;
  cloud?: CloudStart;
  searchNavigation?: SearchNavigationPluginStart;
  licensing: LicensingPluginStart;
  serverless?: ServerlessPluginStart;
}

export interface SearchGettingStartedConfigType {
  enabled: boolean;
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
