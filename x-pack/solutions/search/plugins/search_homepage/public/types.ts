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
import type { ElasticsearchHomePublicStart } from '@kbn/elasticsearch-home/public';

export interface SearchHomepageAppPluginStartDependencies {
  console?: ConsolePluginStart;
  elasticsearchHome: ElasticsearchHomePublicStart;
  usageCollection?: UsageCollectionStart;
  searchNavigation?: SearchNavigationPluginStart;
}

export type SearchHomepageServicesContextDeps = SearchHomepageAppPluginStartDependencies & {
  history: AppMountParameters['history'];
};

export type SearchHomepageServicesContext = CoreStart & SearchHomepageServicesContextDeps;
