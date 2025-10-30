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
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
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

    it('navigate search sidenav & breadcrumbs', async () => {
      const expectNoPageReload = await svlCommonNavigation.createNoPageReloadCheck();

      // check serverless search side nav exists
      await svlCommonNavigation.expectExists();
      await svlCommonNavigation.breadcrumbs.expectExists();
      await svlSearchLandingPage.assertSvlSearchSideNavExists();

      // Should default to Homepage
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'searchHomepage',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Home' });
      await testSubjects.existOrFail(`search-homepage`);

      // Check Side Nav Links
      const sideNavCases: Array<{
        link: { deepLinkId: AppDeepLinkId } | { navId: string } | { text: string };
        breadcrumbs: string[];
        pageTestSubject: string;
      }> = [
        {
          link: { deepLinkId: 'searchHomepage' },
          breadcrumbs: ['Home'],
          pageTestSubject: 'search-homepage',
        },
        {
          link: { navId: 'agent_builder' },
          breadcrumbs: [],
          pageTestSubject: 'agentBuilderWrapper',
        },
        {
          link: { deepLinkId: 'discover' },
          breadcrumbs: ['Discover'],
          pageTestSubject: 'queryInput',
        },
        {
          link: { deepLinkId: 'dashboards' },
          breadcrumbs: ['Dashboards'],
          pageTestSubject: 'dashboardLandingPage',
        },
        {
          link: { deepLinkId: 'searchPlayground' },
          breadcrumbs: ['Build', 'Playground'],
          pageTestSubject: 'playgroundsListPage',
        },
        {
          link: { deepLinkId: 'dev_tools:console' },
          breadcrumbs: ['Developer Tools'],
          pageTestSubject: 'console',
        },
      ];

      for (const testCase of sideNavCases) {
        await solutionNavigation.sidenav.clickLink(testCase.link);
        await solutionNavigation.sidenav.expectLinkActive(testCase.link);
        for (const breadcrumb of testCase.breadcrumbs) {
          await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: breadcrumb });
        }
        await testSubjects.existOrFail(testCase.pageTestSubject);
      }

      // navigate back to serverless search overview
      await svlCommonNavigation.clickLogo();
      await svlCommonNavigation.sidenav.expectLinkActive({
        deepLinkId: 'searchHomepage',
      });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ text: `Home` });
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
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Tags' });

      await svlCommonNavigation.sidenav.clickPanelLink('management:dataViews');
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Data views' });
    });

    it('navigate data management', async () => {
      await svlCommonNavigation.sidenav.openPanel('data_management');
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'management:index_management',
      });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Index Management' });
    });

    it('navigate using search', async () => {
      await svlCommonNavigation.search.showSearch();
      // TODO: test something search project specific instead of generic discover
      await svlCommonNavigation.search.searchFor('discover');
      await svlCommonNavigation.search.clickOnOption(0);
      await svlCommonNavigation.search.hideSearch();

      expect(await browser.getCurrentUrl()).contain('/app/discover');
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
          'searchPlayground',
          'machine_learning',
          // footer:
          'dev_tools',
          'data_management',
          'admin_and_settings',
        ],
        { checkOrder: false }
      );
    });

    it('renders a feedback callout', async function () {
      await solutionNavigation.sidenav.feedbackCallout.reset();
      await solutionNavigation.sidenav.clickLink({ navId: 'admin_and_settings' });
      await solutionNavigation.sidenav.feedbackCallout.expectExists();
      await solutionNavigation.sidenav.feedbackCallout.dismiss();
      await solutionNavigation.sidenav.feedbackCallout.expectMissing();
      await browser.refresh();
      await solutionNavigation.sidenav.feedbackCallout.expectMissing();
    });

    it('renders tour', async () => {
      await solutionNavigation.sidenav.tour.reset();
      await solutionNavigation.sidenav.tour.expectTourStepVisible('sidenav-home');
      await solutionNavigation.sidenav.tour.nextStep();
      await solutionNavigation.sidenav.tour.expectTourStepVisible('sidenav-manage-data');
      await solutionNavigation.sidenav.tour.nextStep();
      await solutionNavigation.sidenav.tour.expectHidden();
      await browser.refresh();
      await solutionNavigation.sidenav.tour.expectHidden();
    });

    it('opens panel on legacy management landing page', async () => {
      await common.navigateToApp('management');
      await testSubjects.exists('cards-navigation-page');
      await solutionNavigation.sidenav.expectPanelExists('admin_and_settings');
    });
  });
}
