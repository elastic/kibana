/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps, FC } from 'react';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { SearchNavigationPluginStart } from '@kbn/search-navigation/public';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { CloudStart } from '@kbn/cloud-plugin/public';
import type { App } from './components/stack_app';

export interface SearchHomepageAppInfo {
  appRoute: string;
  id: string;
  title: string;
}

export interface SearchHomepagePluginSetup {
  /**
   * Search Homepage shared information for the Kibana application.
   * Used to ensure the stack and serverless apps have the same route
   * and deep links.
   */
  app: SearchHomepageAppInfo;
}

export interface SearchHomepagePluginStart {
  /**
   * Search Homepage shared information for the Kibana application.
   * Used to ensure the stack and serverless apps have the same route
   * and deep links.
   */
  app: SearchHomepageAppInfo;
  /**
   * SearchHomepage shared component, used to render the search homepage in
   * the Stack search plugin
   */
  SearchHomepage: FC<ComponentProps<typeof App>>;
}

export interface SearchHomepageAppPluginStartDependencies {
  console?: ConsolePluginStart;
  share: SharePluginStart;
  usageCollection?: UsageCollectionStart;
  cloud?: CloudStart;
  searchNavigation?: SearchNavigationPluginStart;
}

export interface SearchHomepageServicesContextDeps {
  history: AppMountParameters['history'];
  usageCollection?: UsageCollectionStart;
}

export type SearchHomepageServicesContext = CoreStart &
  SearchHomepageAppPluginStartDependencies & {
    history: AppMountParameters['history'];
  };

export interface AppUsageTracker {
  click: (eventName: string | string[]) => void;
  count: (eventName: string | string[]) => void;
  load: (eventName: string | string[]) => void;
}
