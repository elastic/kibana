/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const svlSearchLandingPage = getPageObject('svlSearchLandingPage');
  const svlSearchNavigation = getService('svlSearchNavigation');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const svlCommonPage = getPageObject('svlCommonPage');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  describe('navigation', function () {
    before(async () => {
      await svlCommonPage.login();
      await svlSearchNavigation.navigateToLandingPage();
    });

    after(async () => {
      await svlCommonPage.forceLogout();
    });

    it('navigate search sidenav & breadcrumbs', async () => {
      const expectNoPageReload = await svlCommonNavigation.createNoPageReloadCheck();

      // check serverless search side nav exists
      await svlCommonNavigation.expectExists();
      await svlCommonNavigation.breadcrumbs.expectExists();
      await svlSearchLandingPage.assertSvlSearchSideNavExists();

      // check side nav links
      await testSubjects.existOrFail(`svlSearchOverviewPage`);
      await svlCommonNavigation.sidenav.expectSectionOpen('search_project_nav');
      await svlCommonNavigation.sidenav.expectLinkActive({
        deepLinkId: 'serverlessElasticsearch',
      });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'serverlessElasticsearch',
      });

      // TODO: test something search project specific instead of generic discover
      // navigate to discover
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'discover' });
      await svlCommonNavigation.sidenav.expectLinkActive({ deepLinkId: 'discover' });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ deepLinkId: 'discover' });
      expect(await browser.getCurrentUrl()).contain('/app/discover');

      // navigate to a different section
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'management:index_management' });
      await svlCommonNavigation.sidenav.expectLinkActive({
        deepLinkId: 'management:index_management',
      });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ text: `Index Management` });
      await testSubjects.existOrFail(`indicesTab`);

      // navigate back to serverless search overview
      await svlCommonNavigation.clickLogo();
      await svlCommonNavigation.sidenav.expectLinkActive({
        deepLinkId: 'serverlessElasticsearch',
      });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ text: `Home` });
      await testSubjects.existOrFail(`svlSearchOverviewPage`);

      await expectNoPageReload();
    });

    it("management apps from the sidenav hide the 'stack management' root from the breadcrumbs", async () => {
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'management:triggersActions' });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbTexts(['Alerts', 'Rules']);

      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'management:index_management' });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbTexts(['Index Management', 'Indices']);

      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'management:ingest_pipelines' });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbTexts(['Ingest Pipelines']);

      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'management:api_keys' });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbTexts(['API keys']);
    });

    it('navigate management', async () => {
      await svlCommonNavigation.sidenav.openSection('project_settings_project_nav');
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'management' });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbTexts(['Management']);
      await testSubjects.click('app-card-dataViews');
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
  });
}
