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
  const { solutionNavigation } = getPageObjects(['solutionNavigation']);
  const searchSpace = getService('searchSpace');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');

  describe('Elasticsearch Solution Navigation', () => {
    let cleanUp: () => Promise<unknown>;
    let spaceCreated: { id: string } = { id: '' };

    before(async () => {
      await esArchiver.load(archiveEmptyIndex);
      ({ cleanUp, spaceCreated } = await searchSpace.createTestSpace('search-solution-nav-ftr'));
      await searchSpace.navigateTo(spaceCreated.id);
    });

    after(async () => {
      // Clean up space created
      await cleanUp();
      await esArchiver.unload(archiveEmptyIndex);
    });

    it('renders expected side nav items', async () => {
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Discover' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Dashboards' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Developer Tools' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Agents' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Machine Learning' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Data management' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Getting started' });
    });

    it('has expected navigation', async () => {
      // Navigate to the home page to account for the getting started page redirect
      await searchSpace.navigateTo(`${spaceCreated.id}/app/elasticsearch/home`);
      const expectNoPageReload = await solutionNavigation.createNoPageReloadCheck();

      // check side nav links
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'searchHomepage',
      });

      const sideNavTestCases: Array<{
        link: { deepLinkId: AppDeepLinkId } | { navId: string } | { text: string };
        breadcrumbs: string[];
        pageTestSubject: string;
      }> = [
        {
          link: { navId: 'agent_builder' },
          breadcrumbs: [],
          pageTestSubject: 'agentBuilderWrapper',
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
          link: { deepLinkId: 'searchGettingStarted' },
          breadcrumbs: ['Getting started'],
          pageTestSubject: 'gettingStartedHeader',
        },
        {
          link: { deepLinkId: 'searchGettingStarted' },
          breadcrumbs: ['Getting started'],
          pageTestSubject: 'gettingStartedHeader',
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

      await solutionNavigation.sidenav.expectOnlyDefinedLinks(
        [
          'searchHomepage',
          'agent_builder',
          'discover',
          'dashboards',
          'machine_learning',
          'search_getting_started',
          'dev_tools',
          'data_management',
          'stack_management',
        ],
        { checkOrder: false }
      );
    });
  });
}
