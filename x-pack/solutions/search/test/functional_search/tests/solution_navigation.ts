/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLinkId } from '@kbn/core-chrome-browser';
import type { FtrProviderContext } from '../ftr_provider_context';

const archiveEmptyIndex =
  'x-pack/solutions/search/test/functional_search/fixtures/search-empty-index';

export default function searchSolutionNavigation({
  getPageObjects,
  getService,
}: FtrProviderContext) {
  const { common, solutionNavigation } = getPageObjects([
    'common',
    'solutionNavigation',
    'console',
  ]);
  const spaces = getService('spaces');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');

  describe('Search Solution Navigation', () => {
    let cleanUp: () => Promise<unknown>;
    let spaceCreated: { id: string } = { id: '' };

    before(async () => {
      await esArchiver.load(archiveEmptyIndex);
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
      await esArchiver.unload(archiveEmptyIndex);
    });

    it('renders expected side nav items', async () => {
      // Verify all expected top-level links exist
      const isV2 = await solutionNavigation.sidenav.isV2();

      // Items in both v1 & v2 navigation
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Discover' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Dashboards' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Playground' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Synonyms' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Query rules' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Developer Tools' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Stack Monitoring' });

      if (isV2) {
        await solutionNavigation.sidenav.expectLinkExists({ text: 'Agents' });
        await solutionNavigation.sidenav.expectLinkExists({ text: 'Machine Learning' });
        await solutionNavigation.sidenav.expectLinkExists({ text: 'Maps' });
        await solutionNavigation.sidenav.expectLinkExists({ text: 'Graph' });
        await solutionNavigation.sidenav.expectLinkExists({ text: 'Visualize library' });
        await solutionNavigation.sidenav.expectLinkExists({ text: 'Ingest and manage data' });
      } else {
        await solutionNavigation.sidenav.expectLinkExists({ text: 'Index Management' });
        await solutionNavigation.sidenav.expectLinkExists({ text: 'Search applications' });
        await solutionNavigation.sidenav.expectLinkExists({ text: 'Inference endpoints' });
        await solutionNavigation.sidenav.expectLinkExists({ text: 'Management' });
      }
    });

    it('has expected navigation', async () => {
      const isV2 = await solutionNavigation.sidenav.isV2();

      const expectNoPageReload = await solutionNavigation.createNoPageReloadCheck();

      // check side nav links
      await solutionNavigation.sidenav.expectSectionExists('search_project_nav');
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'searchHomepage',
      });

      const sideNavTestCases: Array<{
        link: { deepLinkId: AppDeepLinkId } | { navId: string } | { text: string };
        breadcrumbs: string[];
        pageTestSubject: string;
      }> = isV2
        ? [
            {
              link: { navId: 'agent_builder' },
              breadcrumbs: ['Agent Chat'],
              pageTestSubject: 'onechatPageConversations',
            },
            {
              link: { deepLinkId: 'agent_builder:tools' },
              breadcrumbs: ['Tools'],
              pageTestSubject: 'kbnAppWrapper visibleChrome',
            },
            {
              link: { deepLinkId: 'agent_builder:agents' },
              breadcrumbs: ['Agents'],
              pageTestSubject: 'kbnAppWrapper visibleChrome',
            },
            {
              link: { deepLinkId: 'discover' },
              breadcrumbs: ['Discover'],
              pageTestSubject: 'noDataViewsPrompt',
            },
            {
              link: { deepLinkId: 'dashboards' },
              breadcrumbs: ['Dashboards'],
              pageTestSubject: 'noDataViewsPrompt',
            },
            {
              link: { deepLinkId: 'searchPlayground' },
              breadcrumbs: ['Build', 'Playground'],
              pageTestSubject: 'playgroundsListPage',
            },
            {
              link: { deepLinkId: 'searchSynonyms:synonyms' },
              breadcrumbs: ['Relevance', 'Synonyms'],
              pageTestSubject: 'searchSynonymsOverviewPage',
            },
            {
              link: { deepLinkId: 'searchQueryRules' },
              breadcrumbs: ['Relevance', 'Query rules'],
              pageTestSubject: 'queryRulesBasePage',
            },
            {
              link: { deepLinkId: 'graph' },
              breadcrumbs: ['Graph'],
              pageTestSubject: 'graphCreateGraphPromptButton',
            },
            {
              link: { deepLinkId: 'visualize' },
              breadcrumbs: ['Visualize library'],
              pageTestSubject: 'noDataViewsPrompt',
            },
            {
              link: { deepLinkId: 'dev_tools' },
              breadcrumbs: ['Developer Tools'],
              pageTestSubject: 'console',
            },
          ]
        : [
            {
              link: { deepLinkId: 'searchHomepage' },
              breadcrumbs: ['Home'],
              pageTestSubject: 'search-homepage',
            },
            {
              link: { deepLinkId: 'discover' },
              breadcrumbs: ['Discover'],
              pageTestSubject: 'noDataViewsPrompt',
            },
            {
              link: { deepLinkId: 'dashboards' },
              breadcrumbs: ['Dashboards'],
              pageTestSubject: 'noDataViewsPrompt',
            },
            {
              link: { deepLinkId: 'elasticsearchIndexManagement' },
              breadcrumbs: ['Build', 'Index Management', 'Indices'],
              pageTestSubject: 'elasticsearchIndexManagement',
            },
            {
              link: { deepLinkId: 'searchPlayground' },
              breadcrumbs: ['Build', 'Playground'],
              pageTestSubject: 'playgroundsListPage',
            },
            {
              link: { deepLinkId: 'enterpriseSearchApplications:searchApplications' },
              breadcrumbs: ['Build', 'Search applications'],
              pageTestSubject: 'searchApplicationsListPage',
            },
            {
              link: { deepLinkId: 'searchSynonyms:synonyms' },
              breadcrumbs: ['Relevance', 'Synonyms'],
              pageTestSubject: 'searchSynonymsOverviewPage',
            },
            {
              link: { deepLinkId: 'searchQueryRules' },
              breadcrumbs: ['Relevance', 'Query rules'],
              pageTestSubject: 'queryRulesBasePage',
            },
            {
              link: { deepLinkId: 'searchInferenceEndpoints:inferenceEndpoints' },
              breadcrumbs: ['Relevance', 'Inference endpoints'],
              pageTestSubject: 'inferenceEndpointsPage',
            },
            {
              link: { deepLinkId: 'dev_tools' },
              breadcrumbs: ['Developer Tools'],
              pageTestSubject: 'console',
            },
          ];

      for (const testCase of sideNavTestCases) {
        await solutionNavigation.sidenav.clickLink(testCase.link);
        await testSubjects.existOrFail(testCase.pageTestSubject);
        await solutionNavigation.sidenav.expectLinkActive(testCase.link);
        for (const breadcrumb of testCase.breadcrumbs) {
          await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: breadcrumb });
        }
      }

      await expectNoPageReload();
    });

    it('renders only expected items', async () => {
      await solutionNavigation.sidenav.clickLink({ deepLinkId: 'searchHomepage' });
      const isV2 = await solutionNavigation.sidenav.isV2();

      if (isV2) {
        // in v2 we don't have "sections" and order is different because items under "more" are in the end
        await solutionNavigation.sidenav.expectOnlyDefinedLinks(
          [
            'searchHomepage',
            'agent_builder',
            'discover',
            'dashboards',
            'searchPlayground',
            'searchSynonyms:synonyms',
            'searchQueryRules',
            'machine_learning',
            'dev_tools',
            'ingest_and_data',
            'monitoring',
            'stack_management',
            // more:
            'maps',
            'graph',
            'visualize',
          ],
          { checkOrder: false }
        );
      } else {
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
          'enterpriseSearchApplications:searchApplications',
          'relevance',
          'searchSynonyms:synonyms',
          'searchQueryRules',
          'searchInferenceEndpoints:inferenceEndpoints',
          'search_project_nav_footer',
          'dev_tools',
          'monitoring',
          'project_settings_project_nav',
          'management:trained_models',
          'stack_management',
        ]);
      }
    });
  });
}
