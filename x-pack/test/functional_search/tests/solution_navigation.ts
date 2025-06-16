/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLinkId } from '@kbn/core-chrome-browser';
import { FtrProviderContext } from '../ftr_provider_context';

export default function searchSolutionNavigation({
  getPageObjects,
  getService,
}: FtrProviderContext) {
  const { common, solutionNavigation, console } = getPageObjects([
    'common',
    'solutionNavigation',
    'console',
  ]);
  const spaces = getService('spaces');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');

  describe('Search Solution Navigation', () => {
    let cleanUp: () => Promise<unknown>;
    let spaceCreated: { id: string } = { id: '' };

    before(async () => {
      // Navigate to the spaces management page which will log us in Kibana
      await common.navigateToUrl('management', 'kibana/spaces', {
        shouldUseHashForSubUrl: false,
      });

      // Create a space with the search solution and navigate to its home page
      ({ cleanUp, space: spaceCreated } = await spaces.create({
        name: 'search-ftr',
        solution: 'es',
      }));
      await browser.navigateTo(spaces.getRootUrl(spaceCreated.id));
    });

    after(async () => {
      // Clean up space created
      await cleanUp();
    });

    it('renders expected side nav items', async () => {
      // Verify all expected top-level links exist
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Home' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Discover' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Dashboards' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Index Management' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Connectors' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Web Crawlers' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Dev Tools' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Playground' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Search applications' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Inference Endpoints' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Synonyms' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Other tools' });
    });

    it('has expected navigation', async () => {
      const expectNoPageReload = await solutionNavigation.createNoPageReloadCheck();

      // check side nav links
      await solutionNavigation.sidenav.expectSectionExists('search_project_nav');
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'enterpriseSearch',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Data' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Index Management' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        text: 'Indices',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        text: 'Create your first index',
      });

      const sideNavTestCases: Array<{
        deepLinkId: AppDeepLinkId;
        breadcrumbs: string[];
        pageTestSubject: string;
        extraChecks?: Array<() => Promise<void>>;
      }> = [
        {
          deepLinkId: 'discover',
          breadcrumbs: ['Analyze', 'Discover'],
          pageTestSubject: 'kbnNoDataPage',
        },
        {
          deepLinkId: 'dashboards',
          breadcrumbs: ['Analyze', 'Dashboards'],
          pageTestSubject: 'kbnNoDataPage',
        },
        {
          deepLinkId: 'elasticsearchIndexManagement',
          breadcrumbs: ['Data', 'Index Management', 'Indices'],
          pageTestSubject: 'elasticsearchIndexManagement',
        },
        {
          deepLinkId: 'enterpriseSearchContent:connectors',
          breadcrumbs: ['Data', 'Connectors'],
          pageTestSubject: 'searchCreateConnectorPage',
        },
        {
          deepLinkId: 'enterpriseSearchContent:webCrawlers',
          breadcrumbs: ['Data', 'Web Crawlers'],
          pageTestSubject: 'searchConnectorsPage',
        },
        {
          deepLinkId: 'dev_tools',
          breadcrumbs: ['Build', 'Dev Tools'],
          pageTestSubject: 'console',
          extraChecks: [
            async () => {
              if (await console.isTourPopoverOpen()) {
                // Skip the tour if it's open. This will prevent the tour popover from staying on the page
                // and blocking breadcrumbs for other tests.
                await console.clickSkipTour();
              }
            },
          ],
        },
        {
          deepLinkId: 'searchPlayground',
          breadcrumbs: ['Build', 'Playground'],
          pageTestSubject: 'svlPlaygroundPage',
        },
        {
          deepLinkId: 'enterpriseSearchApplications:searchApplications',
          breadcrumbs: ['Build', 'Search applications'],
          pageTestSubject: 'searchApplicationsListPage',
        },
        {
          deepLinkId: 'searchInferenceEndpoints:inferenceEndpoints',
          breadcrumbs: ['Relevance', 'Inference Endpoints'],
          pageTestSubject: 'inferenceEndpointsPage',
        },
        {
          deepLinkId: 'searchSynonyms:synonyms',
          breadcrumbs: ['Relevance', 'Synonyms'],
          pageTestSubject: 'searchSynonymsOverviewPage',
        },
      ];

      for (const testCase of sideNavTestCases) {
        await solutionNavigation.sidenav.clickLink({
          deepLinkId: testCase.deepLinkId,
        });
        await testSubjects.existOrFail(testCase.pageTestSubject);
        await solutionNavigation.sidenav.expectLinkActive({
          deepLinkId: testCase.deepLinkId,
        });
        for (const breadcrumb of testCase.breadcrumbs) {
          await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: breadcrumb });
        }
        if (testCase.extraChecks !== undefined) {
          for (const check of testCase.extraChecks) {
            await check();
          }
        }
      }

      // Other tools
      await solutionNavigation.sidenav.openSection('search_project_nav.otherTools');
      await solutionNavigation.sidenav.expectSectionOpen('search_project_nav.otherTools');
      // > Maps
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'maps',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'maps',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Other tools' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        text: 'Maps',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'maps',
      });
      // > Graph
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'graph',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'graph',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Other tools' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        text: 'Graph',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'graph',
      });
      await solutionNavigation.sidenav.closeSection('search_project_nav.otherTools');

      await expectNoPageReload();
    });

    it('renders only expected items', async () => {
      await solutionNavigation.sidenav.openSection('search_project_nav.otherTools');
      await solutionNavigation.sidenav.expectSectionOpen('search_project_nav.otherTools');

      await solutionNavigation.sidenav.openSection(
        'search_project_nav_footer.project_settings_project_nav'
      );
      await solutionNavigation.sidenav.expectSectionOpen(
        'search_project_nav_footer.project_settings_project_nav'
      );

      await solutionNavigation.sidenav.expectOnlyDefinedLinks([
        'search_project_nav',
        'enterpriseSearch',
        'analyze',
        'discover',
        'dashboards',
        'data',
        'elasticsearchIndexManagement',
        'enterpriseSearchContent:connectors',
        'enterpriseSearchContent:webCrawlers',
        'build',
        'dev_tools',
        'searchPlayground',
        'enterpriseSearchApplications:searchApplications',
        'relevance',
        'searchInferenceEndpoints:inferenceEndpoints',
        'searchSynonyms:synonyms',
        'otherTools',
        'maps',
        'graph',
        'search_project_nav_footer',
        'project_settings_project_nav',
        'management:trained_models',
        'stack_management',
        'monitoring',
      ]);
    });
  });
}
