/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchInferenceManagementPageProvider } from './inference_management_page';
import { SearchHomePageProvider } from './search_homepage';
import { SearchIndexDetailPageProvider } from './search_index_details_page';
import { SearchPlaygroundPageProvider } from './search_playground_page';
import { SearchQueryRulesPageProvider } from './search_query_rules_page';
import { SearchSynonymsPageProvider } from './search_synonyms_page';

export const searchSharedPageObjects = {
  searchHomePage: SearchHomePageProvider,
  searchIndexDetailsPage: SearchIndexDetailPageProvider,
  searchInferenceManagementPage: SearchInferenceManagementPageProvider,
  searchPlayground: SearchPlaygroundPageProvider,
  searchQueryRules: SearchQueryRulesPageProvider,
  searchSynonyms: SearchSynonymsPageProvider,
};
