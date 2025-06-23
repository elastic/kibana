/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiText } from '@elastic/eui';
import {
  ENTERPRISE_SEARCH_APP_ID,
  SEARCH_ELASTICSEARCH,
  SEARCH_VECTOR_SEARCH,
  SEARCH_SEMANTIC_SEARCH,
  SEARCH_AI_SEARCH,
} from '@kbn/deeplinks-search';
import { i18n } from '@kbn/i18n';
import type { ClassicNavItem } from '@kbn/search-navigation/public';

import { GETTING_STARTED_TITLE } from '../../../../common/constants';

export const buildBaseClassicNavItems = (): ClassicNavItem[] => {
  const navItems: ClassicNavItem[] = [];

  // Home
  navItems.push({
    'data-test-subj': 'searchSideNav-Home',
    deepLink: {
      link: ENTERPRISE_SEARCH_APP_ID,
      shouldShowActiveForSubroutes: true,
    },
    id: 'home',
    name: (
      <EuiText size="s">
        {i18n.translate('xpack.enterpriseSearch.nav.homeTitle', {
          defaultMessage: 'Home',
        })}
      </EuiText>
    ),
  });

  // Data
  navItems.push({
    'data-test-subj': 'searchSideNav-Data',
    id: 'data',
    items: [
      {
        'data-test-subj': 'searchSideNav-Indices',
        deepLink: {
          link: 'elasticsearchIndexManagement',
        },
        id: 'search_indices',
      },
      {
        'data-test-subj': 'searchSideNav-Connectors',
        deepLink: {
          link: 'enterpriseSearchContent:connectors',
          shouldShowActiveForSubroutes: true,
        },
        id: 'connectors',
      },
      {
        'data-test-subj': 'searchSideNav-Crawlers',
        deepLink: {
          link: 'enterpriseSearchContent:webCrawlers',
          shouldShowActiveForSubroutes: true,
        },
        id: 'crawlers',
      },
    ],
    name: i18n.translate('xpack.enterpriseSearch.nav.dataTitle', {
      defaultMessage: 'Data',
    }),
  });

  // Build
  navItems.push({
    'data-test-subj': 'searchSideNav-Build',
    id: 'build',
    items: [
      {
        'data-test-subj': 'searchSideNav-Playground',
        deepLink: {
          link: 'searchPlayground',
          shouldShowActiveForSubroutes: true,
        },
        id: 'playground',
      },
      {
        'data-test-subj': 'searchSideNav-SearchApplications',
        deepLink: {
          link: 'enterpriseSearchApplications:searchApplications',
        },
        id: 'searchApplications',
      },
    ],
    name: i18n.translate('xpack.enterpriseSearch.nav.applicationsTitle', {
      defaultMessage: 'Build',
    }),
  });

  navItems.push({
    'data-test-subj': 'searchSideNav-Relevance',
    id: 'relevance',
    items: [
      {
        'data-test-subj': 'searchSideNav-InferenceEndpoints',
        deepLink: {
          link: 'searchInferenceEndpoints:inferenceEndpoints',
          shouldShowActiveForSubroutes: true,
        },
        id: 'inference_endpoints',
      },
      {
        'data-test-subj': 'searchSideNav-Synonyms',
        deepLink: {
          link: 'searchSynonyms:synonyms',
          shouldShowActiveForSubroutes: true,
        },
        id: 'synonyms',
      },
      {
        'data-test-subj': 'searchSideNav-QueryRules',
        deepLink: {
          link: 'searchQueryRules',
          shouldShowActiveForSubroutes: true,
        },
        id: 'searchQueryRules',
      },
    ],
    name: i18n.translate('xpack.enterpriseSearch.nav.relevanceTitle', {
      defaultMessage: 'Relevance',
    }),
  });

  // Getting Started
  navItems.push({
    'data-test-subj': 'searchSideNav-GettingStarted',
    id: 'es_getting_started',
    items: [
      {
        'data-test-subj': 'searchSideNav-Elasticsearch',
        deepLink: {
          link: SEARCH_ELASTICSEARCH,
        },
        id: 'elasticsearch',
      },
      {
        'data-test-subj': 'searchSideNav-VectorSearch',
        deepLink: {
          link: SEARCH_VECTOR_SEARCH,
        },
        id: 'vectorSearch',
      },
      {
        'data-test-subj': 'searchSideNav-SemanticSearch',
        deepLink: {
          link: SEARCH_SEMANTIC_SEARCH,
        },
        id: 'semanticSearch',
      },
      {
        'data-test-subj': 'searchSideNav-AISearch',
        deepLink: {
          link: SEARCH_AI_SEARCH,
        },
        id: 'aiSearch',
      },
    ],
    name: GETTING_STARTED_TITLE,
  });

  return navItems;
};
