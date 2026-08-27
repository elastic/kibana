/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLinkId } from '@kbn/core-chrome-browser';
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

const archiveEmptyIndex =
  'x-pack/solutions/search/test/functional_search/fixtures/search-empty-index';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const svlSearchLandingPage = getPageObject('svlSearchLandingPage');
  const svlSearchNavigation = getService('svlSearchNavigation');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const svlCommonPage = getPageObject('svlCommonPage');
  const solutionNavigation = getPageObject('solutionNavigation');
  const globalNav = getService('globalNav');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const common = getPageObject('common');

  describe('navigation', function () {
    before(async () => {
      await esArchiver.load(archiveEmptyIndex);
      await svlCommonPage.loginWithRole('admin');
      await svlSearchNavigation.navigateToElasticsearchHome();
    });
    after(async () => {
      await esArchiver.unload(archiveEmptyIndex);
    });

    it('navigate search sidenav', async () => {
      // Navigate to the home page to account for the getting started page redirect
      await svlSearchNavigation.navigateToElasticsearchHome();
      const expectNoPageReload = await svlCommonNavigation.createNoPageReloadCheck();

      // check serverless search side nav exists
      await svlCommonNavigation.expectExists();
      await svlSearchLandingPage.assertSvlSearchSideNavExists();
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'searchHomepage',
      });
      await testSubjects.existOrFail(`search-homepage`);

      // Check Side Nav Links
      const sideNavCases: Array<{
        link: { deepLinkId: AppDeepLinkId } | { navId: string } | { text: string };
        pageTestSubject: string;
      }> = [
        {
          link: { deepLinkId: 'searchHomepage' },
          pageTestSubject: 'search-homepage',
        },
        {
          link: { navId: 'agent_builder' },
          pageTestSubject: 'agentBuilderWrapper',
        },
        {
          link: { deepLinkId: 'discover' },
          pageTestSubject: 'queryInput',
        },
        {
          link: { deepLinkId: 'dashboards' },
          pageTestSubject: 'dashboardLandingPage',
        },
        {
          link: { deepLinkId: 'searchGettingStarted' },
          pageTestSubject: 'search-getting-started',
        },
        {
          link: { deepLinkId: 'dev_tools:console' },
          pageTestSubject: 'console',
        },
      ];

      for (const testCase of sideNavCases) {
        await solutionNavigation.sidenav.clickLink(testCase.link);
        await solutionNavigation.sidenav.expectLinkActive(testCase.link);
        await testSubjects.existOrFail(testCase.pageTestSubject);
      }

      // navigate back to serverless search overview
      await svlCommonNavigation.clickLogo();
      await svlCommonNavigation.sidenav.expectLinkActive({
        deepLinkId: 'searchHomepage',
      });
      await testSubjects.existOrFail(`search-homepage`);

      await expectNoPageReload();
    });

    it('navigate admin and settings', async () => {
      await svlCommonNavigation.sidenav.openPanel('admin_and_settings');

      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'management:trained_models',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'management:trained_models',
      });

      await svlCommonNavigation.sidenav.clickPanelLink('management:tags');
      await retry.try(async () => {
        expect(await globalNav.getPageTitle()).contain('Tags');
      });

      await svlCommonNavigation.sidenav.clickPanelLink('management:dataViews');
      await retry.try(async () => {
        expect((await globalNav.getPageTitle()).toLowerCase()).contain('data views');
      });
    });

    it('navigates to data management and query rules', async () => {
      await svlCommonNavigation.sidenav.openPanel('data_management');
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'management:index_management',
      });
      await testSubjects.existOrFail('indexTable');

      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'searchQueryRules',
      });
      await testSubjects.existOrFail('queryRulesBasePage');
    });

    it('navigate using search', async () => {
      await svlCommonNavigation.search.showSearch();
      await svlCommonNavigation.search.searchFor('type:application discover');
      await svlCommonNavigation.search.clickOnOption(0);

      await retry.try(async () => {
        expect(await browser.getCurrentUrl()).contain('/app/discover');
      });
    });

    it('does not show cases in sidebar navigation', async () => {
      await svlSearchLandingPage.assertSvlSearchSideNavExists();

      expect(await testSubjects.missingOrFail('cases'));
    });

    it('renders expected side navigation items', async () => {
      await solutionNavigation.sidenav.expectOnlyDefinedLinks(
        [
          // home:
          'searchHomepage',
          // main;
          'agent_builder',
          'discover',
          'dashboards',
          'machine_learning',
          // footer:
          'search_getting_started',
          'dev_tools',
          'workflows',
          'data_management',
          'admin_and_settings',
        ],
        { checkOrder: false }
      );
    });

    it('does not show cloud connect in sidebar navigation', async () => {
      // Cloud Connect should NOT appear in serverless deployments
      expect(await testSubjects.missingOrFail('cloud_connect'));
    });

    it('opens panel on legacy management landing page', async () => {
      await common.navigateToApp('management');
      await testSubjects.exists('cards-navigation-page');
      await solutionNavigation.sidenav.expectPanelExists('admin_and_settings');
    });
  });
}
