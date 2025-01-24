/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { SearchNavigationPluginStart } from '@kbn/search-navigation/public';

export * from '../common/types';
export interface AppPluginStartDependencies {
  history: AppMountParameters['history'];
  console?: ConsolePluginStart;
  searchNavigation?: SearchNavigationPluginStart;
}

export type AppServicesContext = CoreStart & AppPluginStartDependencies;
