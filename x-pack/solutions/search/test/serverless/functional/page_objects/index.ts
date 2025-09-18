/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageObjects as svlPlatformPageObjects } from '@kbn/test-suites-xpack-platform/serverless/functional/page_objects';
import { SvlSearchLandingPageProvider } from './svl_search_landing_page';
import { SvlSearchConnectorsPageProvider } from './svl_search_connectors_page';
import { SvlSearchHomePageProvider } from './svl_search_homepage';
import { SvlSearchIndexDetailPageProvider } from './svl_search_index_detail_page';
import { SvlSearchElasticsearchStartPageProvider } from './svl_search_elasticsearch_start_page';
import { SvlSearchCreateIndexPageProvider } from './svl_search_create_index_page';
import { SvlSearchInferenceManagementPageProvider } from './svl_search_inference_management_page';
import { SearchPlaygroundPageProvider } from '../../../functional_search/page_objects/search_playground_page';
import { SearchQueryRulesPageProvider } from '../../../functional_search/page_objects/search_query_rules_page';
import { SearchSynonymsPageProvider } from '../../../functional_search/page_objects/search_synonyms_page';

export const pageObjects = {
  ...svlPlatformPageObjects,
  // Search Solution serverless FTR page objects
  svlSearchConnectorsPage: SvlSearchConnectorsPageProvider,
  svlSearchLandingPage: SvlSearchLandingPageProvider,
  svlSearchHomePage: SvlSearchHomePageProvider,
  svlSearchIndexDetailPage: SvlSearchIndexDetailPageProvider,
  svlSearchElasticsearchStartPage: SvlSearchElasticsearchStartPageProvider,
  svlSearchCreateIndexPage: SvlSearchCreateIndexPageProvider,
  svlSearchInferenceManagementPage: SvlSearchInferenceManagementPageProvider,
  searchPlayground: SearchPlaygroundPageProvider,
  searchQueryRules: SearchQueryRulesPageProvider,
  searchSynonyms: SearchSynonymsPageProvider,
};
