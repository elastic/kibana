/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageObjects as platformPageObjects } from '@kbn/test-suites-xpack-platform/functional/page_objects';
import { searchSharedPageObjects } from '../../page_objects';
import { SearchApiKeysProvider } from './search_api_keys';
import { SearchClassicNavigationProvider } from './search_classic_navigation';
import { SearchStartProvider } from './search_start';
import { SearchNavigationProvider } from './search_navigation';
import { SearchOverviewProvider } from './search_overview_page';

export const pageObjects = {
  ...platformPageObjects,
  ...searchSharedPageObjects,
  searchApiKeys: SearchApiKeysProvider,
  searchClassicNavigation: SearchClassicNavigationProvider,
  searchStart: SearchStartProvider,
  searchNavigation: SearchNavigationProvider,
  searchOverview: SearchOverviewProvider,
};
