/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchNavigationPluginStart } from '@kbn/search-navigation/public';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';

export * from '../common/types';
export interface AppPluginStartDependencies {
  history: AppMountParameters['history'];
  console?: ConsolePluginStart;
  share?: SharePluginStart;
  cloud?: CloudStart;
  searchNavigation?: SearchNavigationPluginStart;
  usageCollection?: UsageCollectionStart;
}

export type AppServicesContext = CoreStart & AppPluginStartDependencies;
