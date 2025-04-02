/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./nav_link_helpers', () => ({
  generateNavLink: jest.fn(({ to, items }) => ({ href: to, items })),
}));

import { setMockValues, mockKibanaValues } from '../../__mocks__/kea_logic';

import { renderHook } from '@testing-library/react';

import { DEFAULT_PRODUCT_FEATURES } from '../../../../common/constants';

import {
  useEnterpriseSearchNav,
  useEnterpriseSearchApplicationNav,
  useEnterpriseSearchAnalyticsNav,
} from './nav';

const baseNavItems = [
  expect.objectContaining({
    'data-test-subj': 'searchSideNav-Home',
    href: '/app/elasticsearch/overview',
    id: 'home',
    items: undefined,
  }),
  {
    'data-test-subj': 'searchSideNav-Content',
    id: 'content',
    items: [
      {
        'data-test-subj': 'searchSideNav-Indices',
        href: '/app/elasticsearch/index_management',
        id: 'search_indices',
        items: undefined,
        name: 'Index Management',
      },
      {
        'data-test-subj': 'searchSideNav-Connectors',
        href: '/app/elasticsearch/content/connectors',
        id: 'connectors',
        items: undefined,
        name: 'Connectors',
      },
      {
        'data-test-subj': 'searchSideNav-Crawlers',
        href: '/app/elasticsearch/content/crawlers',
        id: 'crawlers',
        items: undefined,
        name: 'Web Crawlers',
      },
    ],
    name: 'Content',
  },
  {
    'data-test-subj': 'searchSideNav-Build',
    id: 'build',
    items: [
      {
        'data-test-subj': 'searchSideNav-Playground',
        href: '/app/search_playground',
        id: 'playground',
        items: undefined,
        name: 'Playground',
      },
      {
        'data-test-subj': 'searchSideNav-SearchApplications',
        href: '/app/elasticsearch/applications/search_applications',
        id: 'searchApplications',
        items: undefined,
        name: 'Search Applications',
      },
    ],
    name: 'Build',
  },
  {
    'data-test-subj': 'searchSideNav-Relevance',
    id: 'relevance',
    items: [
      {
        'data-test-subj': 'searchSideNav-InferenceEndpoints',
        href: '/app/elasticsearch/relevance/inference_endpoints',
        id: 'inference_endpoints',
        items: undefined,
        name: 'Inference Endpoints',
      },
    ],
    name: 'Relevance',
  },
  {
    'data-test-subj': 'searchSideNav-GettingStarted',
    id: 'es_getting_started',
    items: [
      {
        'data-test-subj': 'searchSideNav-Elasticsearch',
        href: '/app/elasticsearch/elasticsearch',
        id: 'elasticsearch',
        items: undefined,
        name: 'Elasticsearch',
      },
      {
        'data-test-subj': 'searchSideNav-VectorSearch',
        href: '/app/elasticsearch/vector_search',
        id: 'vectorSearch',
        items: undefined,
        name: 'Vector Search',
      },
      {
        'data-test-subj': 'searchSideNav-SemanticSearch',
        href: '/app/elasticsearch/semantic_search',
        id: 'semanticSearch',
        items: undefined,
        name: 'Semantic Search',
      },
      {
        'data-test-subj': 'searchSideNav-AISearch',
        href: '/app/elasticsearch/ai_search',
        id: 'aiSearch',
        items: undefined,
        name: 'AI Search',
      },
    ],
    name: 'Getting started',
  },
];

const mockNavLinks = [
  {
    id: 'enterpriseSearch',
    url: '/app/elasticsearch/overview',
  },
  {
    id: 'elasticsearchIndexManagement',
    title: 'Index Management',
    url: '/app/elasticsearch/index_management',
  },
  {
    id: 'enterpriseSearchContent:connectors',
    title: 'Connectors',
    url: '/app/elasticsearch/content/connectors',
  },
  {
    id: 'enterpriseSearchContent:webCrawlers',
    title: 'Web Crawlers',
    url: '/app/elasticsearch/content/crawlers',
  },
  {
    id: 'searchPlayground',
    title: 'Playground',
    url: '/app/search_playground',
  },
  {
    id: 'enterpriseSearchApplications:searchApplications',
    title: 'Search Applications',
    url: '/app/elasticsearch/applications/search_applications',
  },
  {
    id: 'enterpriseSearchAnalytics',
    title: 'Behavioral Analytics',
    url: '/app/elasticsearch/analytics',
  },
  {
    id: 'searchInferenceEndpoints:inferenceEndpoints',
    title: 'Inference Endpoints',
    url: '/app/elasticsearch/relevance/inference_endpoints',
  },
  {
    id: 'enterpriseSearchElasticsearch',
    title: 'Elasticsearch',
    url: '/app/elasticsearch/elasticsearch',
  },
  {
    id: 'enterpriseSearchVectorSearch',
    title: 'Vector Search',
    url: '/app/elasticsearch/vector_search',
  },
  {
    id: 'enterpriseSearchSemanticSearch',
    title: 'Semantic Search',
    url: '/app/elasticsearch/semantic_search',
  },
  {
    id: 'enterpriseSearchAISearch',
    title: 'AI Search',
    url: '/app/elasticsearch/ai_search',
  },
];

const defaultMockValues = {
  hasEnterpriseLicense: true,
  isSidebarEnabled: true,
  productFeatures: DEFAULT_PRODUCT_FEATURES,
};

describe('useEnterpriseSearchContentNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibanaValues.uiSettings.get.mockReturnValue(false);
    mockKibanaValues.getNavLinks.mockReturnValue(mockNavLinks);
  });

  it('returns an array of top-level Enterprise Search nav items', () => {
    setMockValues(defaultMockValues);

    const { result } = renderHook(() => useEnterpriseSearchNav());

    expect(result.current).toEqual(baseNavItems);
  });
});

describe('useEnterpriseSearchApplicationNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibanaValues.getNavLinks.mockReturnValue(mockNavLinks);
    mockKibanaValues.uiSettings.get.mockReturnValue(true);
    setMockValues(defaultMockValues);
  });

  it('returns an array of top-level Enterprise Search nav items', () => {
    const { result } = renderHook(() => useEnterpriseSearchApplicationNav());
    expect(result.current).toEqual(baseNavItems);
  });
});

describe('useEnterpriseSearchAnalyticsNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(defaultMockValues);
    mockKibanaValues.getNavLinks.mockReturnValue(mockNavLinks);
  });

  it('returns basic nav all params are empty', () => {
    const { result } = renderHook(() => useEnterpriseSearchAnalyticsNav());

    expect(result.current).toEqual([
      baseNavItems[0],
      baseNavItems[1],

      {
        'data-test-subj': 'searchSideNav-Build',
        id: 'build',
        items: [
          {
            'data-test-subj': 'searchSideNav-Playground',
            href: '/app/search_playground',
            id: 'playground',
            items: undefined,
            name: 'Playground',
          },
          {
            'data-test-subj': 'searchSideNav-SearchApplications',
            href: '/app/elasticsearch/applications/search_applications',
            id: 'searchApplications',
            items: undefined,
            name: 'Search Applications',
          },

          {
            href: '/app/elasticsearch/analytics',
            id: 'analyticsCollections',
            items: undefined,
            name: 'Behavioral Analytics',
          },
        ],
        name: 'Build',
      },
      baseNavItems[3],
      baseNavItems[4],
    ]);
  });

  it('returns basic nav if only name provided', () => {
    const {
      result: { current: navItems },
    } = renderHook(() => useEnterpriseSearchAnalyticsNav('my-test-collection'));
    expect(navItems).toEqual(
      baseNavItems.map((item) =>
        item.id === 'content'
          ? {
              ...item,
              items: item.items,
            }
          : item
      )
    );
  });
});
