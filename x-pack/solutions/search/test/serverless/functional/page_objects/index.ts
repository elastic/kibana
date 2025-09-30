/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageObjects as svlPlatformPageObjects } from '@kbn/test-suites-xpack-platform/serverless/functional/page_objects';
import { searchSharedPageObjects } from '../../../page_objects';
import { SvlSearchLandingPageProvider } from './svl_search_landing_page';
import { SvlSearchConnectorsPageProvider } from './svl_search_connectors_page';
import { SvlSearchCreateIndexPageProvider } from './svl_search_create_index_page';

export const pageObjects = {
  ...svlPlatformPageObjects,
  // Search Solution shared FTR page objects
  ...searchSharedPageObjects,
  // Search Solution serverless FTR page objects
  svlSearchConnectorsPage: SvlSearchConnectorsPageProvider,
  svlSearchLandingPage: SvlSearchLandingPageProvider,
  svlSearchCreateIndexPage: SvlSearchCreateIndexPageProvider,
};
