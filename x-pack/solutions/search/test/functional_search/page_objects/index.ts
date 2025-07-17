/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageObjects as platformPageObjects } from '@kbn/test-suites-xpack-platform/functional/page_objects';
import { SearchApiKeysProvider } from './search_api_keys';
import { SearchClassicNavigationProvider } from './search_classic_navigation';
import { SearchStartProvider } from './search_start';
import { SearchIndexDetailPageProvider } from './search_index_details_page';
import { SearchNavigationProvider } from './search_navigation';
import { SearchOverviewProvider } from './search_overview_page';
import { SearchHomePageProvider } from './search_homepage';
import { SearchPlaygroundPageProvider } from './search_playground_page';

export const pageObjects = {
  ...platformPageObjects,
  searchApiKeys: SearchApiKeysProvider,
  searchClassicNavigation: SearchClassicNavigationProvider,
  searchStart: SearchStartProvider,
  searchIndexDetailsPage: SearchIndexDetailPageProvider,
  searchNavigation: SearchNavigationProvider,
  searchOverview: SearchOverviewProvider,
  searchHomePage: SearchHomePageProvider,
  searchPlayground: SearchPlaygroundPageProvider,
};
