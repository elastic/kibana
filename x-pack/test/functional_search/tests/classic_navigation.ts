/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function searchSolutionNavigation({
  getPageObjects,
  getService,
}: FtrProviderContext) {
  const { common, searchClassicNavigation } = getPageObjects(['common', 'searchClassicNavigation']);
  const spaces = getService('spaces');
  const browser = getService('browser');

  describe('Search Classic Navigation', () => {
    let cleanUp: () => Promise<unknown>;
    let spaceCreated: { id: string } = { id: '' };

    before(async () => {
      // Navigate to the spaces management page which will log us in Kibana
      await common.navigateToUrl('management', 'kibana/spaces', {
        shouldUseHashForSubUrl: false,
      });

      // Create a space with the search solution and navigate to its home page
      ({ cleanUp, space: spaceCreated } = await spaces.create({ solution: 'classic' }));
      await browser.navigateTo(spaces.getRootUrl(spaceCreated.id));
      await common.navigateToApp('enterpriseSearch');
    });

    after(async () => {
      // Clean up space created
      await cleanUp();
    });

    it('renders expected navigation items', async () => {
      await searchClassicNavigation.expectAllNavItems([
        { id: 'Home', label: 'Home' },
        { id: 'Content', label: 'Content' },
        { id: 'Indices', label: 'Indices' },
        { id: 'Connectors', label: 'Connectors' },
        { id: 'Crawlers', label: 'Web Crawlers' },
        { id: 'Build', label: 'Build' },
        { id: 'Playground', label: 'Playground' },
        { id: 'SearchApplications', label: 'Search Applications' },
        { id: 'BehavioralAnalytics', label: 'Behavioral Analytics' },
        { id: 'Relevance', label: 'Relevance' },
        { id: 'InferenceEndpoints', label: 'Inference Endpoints' },
        { id: 'GettingStarted', label: 'Getting started' },
        { id: 'Elasticsearch', label: 'Elasticsearch' },
        { id: 'VectorSearch', label: 'Vector Search' },
        { id: 'SemanticSearch', label: 'Semantic Search' },
        { id: 'AISearch', label: 'AI Search' },
      ]);
    });
    it('has expected navigation', async () => {
      const expectNoPageReload = await searchClassicNavigation.createNoPageReloadCheck();

      await searchClassicNavigation.expectNavItemExists('Home');

      // Check Content
      // > Indices
      await searchClassicNavigation.clickNavItem('Indices');
      await searchClassicNavigation.expectNavItemActive('Indices');
      await searchClassicNavigation.breadcrumbs.expectBreadcrumbExists('Content');
      await searchClassicNavigation.breadcrumbs.expectBreadcrumbExists('Elasticsearch indices');
      // > Connectors
      await searchClassicNavigation.clickNavItem('Connectors');
      await searchClassicNavigation.expectNavItemActive('Connectors');
      await searchClassicNavigation.breadcrumbs.expectBreadcrumbExists('Content');
      await searchClassicNavigation.breadcrumbs.expectBreadcrumbExists('Connectors');
      // > Crawlers
      await searchClassicNavigation.clickNavItem('Crawlers');
      await searchClassicNavigation.expectNavItemActive('Crawlers');
      await searchClassicNavigation.breadcrumbs.expectBreadcrumbExists('Content');
      await searchClassicNavigation.breadcrumbs.expectBreadcrumbExists('Web Crawlers');

      // Check Build
      // > Playground
      await searchClassicNavigation.clickNavItem('Playground');
      await searchClassicNavigation.expectNavItemActive('Playground');
      await searchClassicNavigation.breadcrumbs.expectBreadcrumbExists('Build');
      await searchClassicNavigation.breadcrumbs.expectBreadcrumbExists('Playground');
      // > SearchApplications
      await searchClassicNavigation.clickNavItem('SearchApplications');
      await searchClassicNavigation.expectNavItemActive('SearchApplications');
      await searchClassicNavigation.breadcrumbs.expectBreadcrumbExists('Build');
      await searchClassicNavigation.breadcrumbs.expectBreadcrumbExists('Search Applications');
      // > BehavioralAnalytics
      await searchClassicNavigation.clickNavItem('BehavioralAnalytics');
      await searchClassicNavigation.expectNavItemActive('BehavioralAnalytics');
      await searchClassicNavigation.breadcrumbs.expectBreadcrumbExists('Build');
      await searchClassicNavigation.breadcrumbs.expectBreadcrumbExists('Behavioral Analytics');

      // Check Relevance
      // > InferenceEndpoints
      await searchClassicNavigation.clickNavItem('InferenceEndpoints');
      await searchClassicNavigation.expectNavItemActive('InferenceEndpoints');
      await searchClassicNavigation.breadcrumbs.expectBreadcrumbExists('Relevance');
      await searchClassicNavigation.breadcrumbs.expectBreadcrumbExists('Inference Endpoints');

      // Check Getting started
      // > Elasticsearch
      await searchClassicNavigation.clickNavItem('Elasticsearch');
      await searchClassicNavigation.expectNavItemActive('Elasticsearch');
      await searchClassicNavigation.breadcrumbs.expectBreadcrumbExists(
        'Getting started with Elasticsearch'
      );
      // > VectorSearch
      await searchClassicNavigation.clickNavItem('VectorSearch');
      await searchClassicNavigation.expectNavItemActive('VectorSearch');
      await searchClassicNavigation.breadcrumbs.expectBreadcrumbExists('Getting started');
      await searchClassicNavigation.breadcrumbs.expectBreadcrumbExists('Vector Search');
      // > SemanticSearch
      await searchClassicNavigation.clickNavItem('SemanticSearch');
      await searchClassicNavigation.expectNavItemActive('SemanticSearch');
      await searchClassicNavigation.breadcrumbs.expectBreadcrumbExists('Getting started');
      await searchClassicNavigation.breadcrumbs.expectBreadcrumbExists('Semantic Search');
      // > AISearch
      await searchClassicNavigation.clickNavItem('AISearch');
      await searchClassicNavigation.expectNavItemActive('AISearch');
      await searchClassicNavigation.breadcrumbs.expectBreadcrumbExists('Getting started');
      await searchClassicNavigation.breadcrumbs.expectBreadcrumbExists('AI Search');

      await expectNoPageReload();
    });
  });
}
