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
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Playground' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Connectors' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Search applications' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Synonyms' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Query Rules' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Inference Endpoints' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Dev Tools' });
    });

    it('has expected navigation', async () => {
      const expectNoPageReload = await solutionNavigation.createNoPageReloadCheck();

      // check side nav links
      await solutionNavigation.sidenav.expectSectionExists('search_project_nav');
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'searchHomepage',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        text: 'Create your first index',
      });

      const sideNavTestCases: Array<{
        deepLinkId: AppDeepLinkId;
        breadcrumbs: string[];
        pageTestSubject: string;
      }> = [
        {
          deepLinkId: 'discover',
          breadcrumbs: ['Discover'],
          pageTestSubject: 'kbnNoDataPage',
        },
        {
          deepLinkId: 'dashboards',
          breadcrumbs: ['Dashboards'],
          pageTestSubject: 'kbnNoDataPage',
        },
        {
          deepLinkId: 'elasticsearchIndexManagement',
          breadcrumbs: ['Build', 'Index Management', 'Indices'],
          pageTestSubject: 'elasticsearchIndexManagement',
        },
        {
          deepLinkId: 'searchPlayground',
          breadcrumbs: ['Build', 'Playground'],
          pageTestSubject: 'svlPlaygroundPage',
        },
        {
          deepLinkId: 'enterpriseSearchContent:connectors',
          breadcrumbs: ['Build', 'Connectors'],
          pageTestSubject: 'searchCreateConnectorPage',
        },
        {
          deepLinkId: 'enterpriseSearchApplications:searchApplications',
          breadcrumbs: ['Build', 'Search applications'],
          pageTestSubject: 'searchApplicationsListPage',
        },
        {
          deepLinkId: 'searchSynonyms:synonyms',
          breadcrumbs: ['Relevance', 'Synonyms'],
          pageTestSubject: 'searchSynonymsOverviewPage',
        },
        {
          deepLinkId: 'searchInferenceEndpoints:inferenceEndpoints',
          breadcrumbs: ['Relevance', 'Inference Endpoints'],
          pageTestSubject: 'inferenceEndpointsPage',
        },
        {
          deepLinkId: 'dev_tools',
          breadcrumbs: ['Dev Tools'],
          pageTestSubject: 'console',
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
      }

      await expectNoPageReload();
    });

    it('renders only expected items', async () => {
      await solutionNavigation.sidenav.openSection(
        'search_project_nav_footer.project_settings_project_nav'
      );
      await solutionNavigation.sidenav.expectSectionOpen(
        'search_project_nav_footer.project_settings_project_nav'
      );
      await solutionNavigation.sidenav.expectOnlyDefinedLinks([
        'search_project_nav',
        'searchHomepage',
        'discover',
        'dashboards',
        'build',
        'elasticsearchIndexManagement',
        'searchPlayground',
        'enterpriseSearchContent:connectors',
        'enterpriseSearchApplications:searchApplications',
        'relevance',
        'searchSynonyms:synonyms',
        'searchQueryRules',
        'searchInferenceEndpoints:inferenceEndpoints',
        'search_project_nav_footer',
        'dev_tools',
        'project_settings_project_nav',
        'management:trained_models',
        'stack_management',
        'monitoring',
      ]);
    });
  });
}
