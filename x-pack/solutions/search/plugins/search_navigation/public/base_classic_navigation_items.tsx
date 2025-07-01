/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiText } from '@elastic/eui';
import { SEARCH_HOMEPAGE } from '@kbn/deeplinks-search';
import { i18n } from '@kbn/i18n';

import type { ClassicNavItem } from './types';

export const BaseClassicNavItems: ClassicNavItem[] = [
  {
    'data-test-subj': 'searchSideNav-Home',
    deepLink: {
      link: SEARCH_HOMEPAGE,
      shouldShowActiveForSubroutes: true,
    },
    id: 'home',
    name: (
      <EuiText size="s">
        {i18n.translate('xpack.searchNavigation.classicNav.homeTitle', {
          defaultMessage: 'Home',
        })}
      </EuiText>
    ),
  },
  {
    'data-test-subj': 'searchSideNav-Build',
    id: 'build',
    items: [
      {
        'data-test-subj': 'searchSideNav-Indices',
        deepLink: {
          link: 'elasticsearchIndexManagement',
        },
        id: 'search_indices',
      },
      {
        'data-test-subj': 'searchSideNav-Playground',
        deepLink: {
          link: 'searchPlayground',
          shouldShowActiveForSubroutes: true,
        },
        id: 'playground',
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
        'data-test-subj': 'searchSideNav-SearchApplications',
        deepLink: {
          link: 'enterpriseSearchApplications:searchApplications',
        },
        id: 'searchApplications',
      },
    ],
    name: i18n.translate('xpack.searchNavigation.classicNav.applicationsTitle', {
      defaultMessage: 'Build',
    }),
  },
  {
    'data-test-subj': 'searchSideNav-Relevance',
    id: 'relevance',
    items: [
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
      {
        'data-test-subj': 'searchSideNav-InferenceEndpoints',
        deepLink: {
          link: 'searchInferenceEndpoints:inferenceEndpoints',
          shouldShowActiveForSubroutes: true,
        },
        id: 'inference_endpoints',
      },
    ],
    name: i18n.translate('xpack.searchNavigation.classicNav.relevanceTitle', {
      defaultMessage: 'Relevance',
    }),
  },
];
