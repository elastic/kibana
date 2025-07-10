/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLinkId } from '@kbn/core-chrome-browser';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const archiveEmptyIndex = 'x-pack/test/functional_search/fixtures/search-empty-index';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const svlSearchLandingPage = getPageObject('svlSearchLandingPage');
  const svlSearchNavigation = getService('svlSearchNavigation');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const svlCommonPage = getPageObject('svlCommonPage');
  const solutionNavigation = getPageObject('solutionNavigation');
  const console = getPageObject('console');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const header = getPageObject('header');
  const esArchiver = getService('esArchiver');

  describe('navigation', function () {
    before(async () => {
      await esArchiver.load(archiveEmptyIndex);
      await svlCommonPage.loginWithRole('developer');
      await svlSearchNavigation.navigateToLandingPage();
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

      await solutionNavigation.sidenav.expectSectionExists('search_project_nav');
      // Should default to Homepage
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'searchHomepage',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Home' });
      await testSubjects.existOrFail(`search-homepage`);

      // Check Side Nav Links
      const sideNavCases: Array<{
        deepLinkId: AppDeepLinkId;
        breadcrumbs: string[];
        pageTestSubject: string;
        extraCheck?: () => Promise<void>;
      }> = [
        {
          deepLinkId: 'searchHomepage',
          breadcrumbs: ['Home'],
          pageTestSubject: 'search-homepage',
        },
        {
          deepLinkId: 'discover',
          breadcrumbs: ['Discover'],
          pageTestSubject: 'queryInput',
        },
        {
          deepLinkId: 'dashboards',
          breadcrumbs: ['Dashboards'],
          pageTestSubject: 'dashboardLandingPage',
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
          deepLinkId: 'serverlessConnectors',
          breadcrumbs: ['Build', 'Connectors'],
          pageTestSubject: 'svlSearchConnectorsPage',
        },
        {
          deepLinkId: 'searchSynonyms',
          breadcrumbs: ['Relevance', 'Synonyms'],
          pageTestSubject: 'searchSynonymsOverviewPage',
        },
        {
          deepLinkId: 'searchQueryRules',
          breadcrumbs: ['Relevance', 'Query Rules'],
          pageTestSubject: 'queryRulesBasePage',
        },
        {
          deepLinkId: 'searchInferenceEndpoints',
          breadcrumbs: ['Relevance', 'Inference Endpoints'],
          pageTestSubject: 'inferenceEndpointsPage',
        },
        {
          deepLinkId: 'dev_tools:console',
          breadcrumbs: ['Developer Tools'],
          pageTestSubject: 'console',
          extraCheck: async () => {
            if (await console.isTourPopoverOpen()) {
              // Skip the tour if it's open. This will prevent the tour popover from staying on the page
              // and blocking breadcrumbs for other tests.
              await console.clickSkipTour();
            }
          },
        },
      ];

      for (const testCase of sideNavCases) {
        await solutionNavigation.sidenav.clickLink({
          deepLinkId: testCase.deepLinkId,
        });
        await solutionNavigation.sidenav.expectLinkActive({
          deepLinkId: testCase.deepLinkId,
        });
        for (const breadcrumb of testCase.breadcrumbs) {
          await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: breadcrumb });
        }
        await testSubjects.existOrFail(testCase.pageTestSubject);
        if (testCase.extraCheck !== undefined) {
          await testCase.extraCheck();
        }
      }

      // Open Project Settings
      await solutionNavigation.sidenav.openSection(
        'search_project_nav_footer.project_settings_project_nav'
      );
      // check Project Settings
      // > Trained Models
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'management:trained_models',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'management:trained_models',
      });
      // > Management
      await solutionNavigation.sidenav.clickLink({ navId: 'management' });
      await solutionNavigation.sidenav.expectLinkActive({ navId: 'management' });
      await svlCommonNavigation.sidenav.clickPanelLink('management:tags');
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbTexts(['Management', 'Tags']);

      // navigate back to serverless search overview
      await svlCommonNavigation.clickLogo();
      await svlCommonNavigation.sidenav.expectLinkActive({
        deepLinkId: 'searchHomepage',
      });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ text: `Home` });
      await testSubjects.existOrFail(`search-homepage`);

      await expectNoPageReload();
    });

    it('navigate to playground from side nav', async () => {
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'searchPlayground' });
      await header.waitUntilLoadingHasFinished();
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbTexts(['Build', 'Playground']);

      await svlCommonNavigation.sidenav.expectLinkActive({ deepLinkId: 'searchPlayground' });
      expect(await browser.getCurrentUrl()).contain('/app/search_playground/chat');
    });

    it("management apps from the sidenav hide the 'stack management' root from the breadcrumbs", async () => {
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'elasticsearchIndexManagement' });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbTexts([
        'Build',
        'Index Management',
        'Indices',
      ]);
    });

    it('navigate management', async () => {
      await svlCommonNavigation.sidenav.openSection(
        'search_project_nav_footer.project_settings_project_nav'
      );
      await svlCommonNavigation.sidenav.clickLink({ navId: 'management' });
      await svlCommonNavigation.sidenav.clickPanelLink('management:tags');
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbTexts(['Management', 'Tags']);

      await svlCommonNavigation.sidenav.clickLink({ navId: 'management' });
      await svlCommonNavigation.sidenav.clickPanelLink('management:dataViews');
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbTexts(['Management', 'Data views']);
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

    it('does not navigate to cases app', async () => {
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'discover' });

      expect(await browser.getCurrentUrl()).not.contain('/app/management/cases');
      await testSubjects.missingOrFail('cases-all-title');
    });

    it('renders expected side navigation items', async () => {
      await solutionNavigation.sidenav.openSection(
        'search_project_nav_footer.project_settings_project_nav'
      );
      // Verify all expected top-level links exist
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Home' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Discover' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Dashboards' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Build' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Index Management' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Playground' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Connectors' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Relevance' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Synonyms' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Query Rules' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Inference Endpoints' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Developer Tools' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Trained Models' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Management' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Performance' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Billing and subscription' });

      await solutionNavigation.sidenav.openSection(
        'search_project_nav_footer.project_settings_project_nav'
      );
      await solutionNavigation.sidenav.expectOnlyDefinedLinks([
        'search_project_nav',
        'home',
        'discover',
        'dashboards',
        'build',
        'elasticsearchIndexManagement',
        'searchPlayground',
        'serverlessConnectors',
        'relevance',
        'searchSynonyms',
        'searchQueryRules',
        'searchInferenceEndpoints',
        'search_project_nav_footer',
        'dev_tools',
        'project_settings_project_nav',
        'management:trained_models',
        'management',
        'cloudLinkDeployment',
        'cloudLinkBilling',
      ]);
    });
  });
}
