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
  const testSubjects = getService('testSubjects');

  describe('Search Classic Navigation', () => {
    let cleanUp: () => Promise<unknown>;
    let spaceCreated: { id: string } = { id: '' };

    before(async () => {
      // Navigate to the spaces management page which will log us in Kibana
      await common.navigateToUrl('management', 'kibana/spaces', {
        shouldUseHashForSubUrl: false,
      });

      // Create a space with the search solution and navigate to its home page
      ({ cleanUp, space: spaceCreated } = await spaces.create({
        name: 'search-classic-ftr',
        solution: 'classic',
      }));
      await browser.navigateTo(spaces.getRootUrl(spaceCreated.id));
      await common.navigateToApp('searchHomepage');
    });

    after(async () => {
      // Clean up space created
      await cleanUp();
    });

    it('renders expected navigation items', async () => {
      await searchClassicNavigation.expectAllNavItems([
        { id: 'Home', label: 'Home' },
        { id: 'Build', label: 'Build' },
        { id: 'Indices', label: 'Index Management' },
        { id: 'Playground', label: 'Playground' },
        { id: 'Connectors', label: 'Connectors' },
        { id: 'SearchApplications', label: 'Search Applications' },
        { id: 'Relevance', label: 'Relevance' },
        { id: 'Synonyms', label: 'Synonyms' },
        { id: 'QueryRules', label: 'Query Rules' },
        { id: 'InferenceEndpoints', label: 'Inference Endpoints' },
      ]);
    });
    it('has expected navigation', async () => {
      const expectNoPageReload = await searchClassicNavigation.createNoPageReloadCheck();

      await searchClassicNavigation.expectNavItemExists('Home');

      const sideNavTestCases: Array<{
        navItem: string;
        breadcrumbs: string[];
        pageTestSubject: string;
      }> = [
        {
          navItem: 'Indices',
          breadcrumbs: ['Build', 'Index Management'],
          pageTestSubject: 'indexManagementHeaderContent',
        },
        {
          navItem: 'Connectors',
          breadcrumbs: ['Build', 'Connectors'],
          pageTestSubject: 'searchCreateConnectorPage',
        },
        {
          navItem: 'Playground',
          breadcrumbs: ['Build', 'Playground'],
          pageTestSubject: 'svlPlaygroundPage',
        },
        {
          navItem: 'SearchApplications',
          breadcrumbs: ['Build', 'Search Applications'],
          pageTestSubject: 'searchApplicationsListPage',
        },
        {
          navItem: 'Synonyms',
          breadcrumbs: ['Relevance', 'Synonyms'],
          pageTestSubject: 'searchSynonymsOverviewPage',
        },
        {
          navItem: 'QueryRules',
          breadcrumbs: ['Relevance', 'Query Rules'],
          pageTestSubject: 'queryRulesBasePage',
        },
        {
          navItem: 'InferenceEndpoints',
          breadcrumbs: ['Relevance', 'Inference Endpoints'],
          pageTestSubject: 'inferenceEndpointsPage',
        },
      ];

      for (const testCase of sideNavTestCases) {
        await searchClassicNavigation.clickNavItem(testCase.navItem);
        // Wait for the date test subj to ensure the page is loaded before continuing
        await testSubjects.existOrFail(testCase.pageTestSubject);
        await searchClassicNavigation.expectNavItemActive(testCase.navItem);
        for (const breadcrumb of testCase.breadcrumbs) {
          await searchClassicNavigation.breadcrumbs.expectBreadcrumbExists(breadcrumb);
        }
      }

      await expectNoPageReload();
    });
  });
}
