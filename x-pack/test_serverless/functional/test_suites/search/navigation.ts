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
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  describe('navigation', function () {
    before(async () => {
      await svlSearchNavigation.navigateToLandingPage();
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
      await svlCommonNavigation.sidenav.expectSectionClosed('rootNav:ml');

      // TODO: test something search project specific instead of generic discover
      // navigate to discover
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'discover' });
      await svlCommonNavigation.sidenav.expectLinkActive({ deepLinkId: 'discover' });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ text: `Explore` });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ deepLinkId: 'discover' });
      await expect(await browser.getCurrentUrl()).contain('/app/discover');

      // navigate to a different section
      await svlCommonNavigation.sidenav.openSection('rootNav:ml');
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'ml:notifications' });
      await svlCommonNavigation.sidenav.expectLinkActive({ deepLinkId: 'ml:notifications' });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ text: `Machine Learning` });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'ml:notifications',
      });
      await testSubjects.existOrFail(`mlPageNotifications`);

      // navigate back to serverless search overview
      await svlCommonNavigation.breadcrumbs.clickHome();
      await svlCommonNavigation.sidenav.expectLinkActive({
        deepLinkId: 'serverlessElasticsearch',
      });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ text: `Getting started` });
      await testSubjects.existOrFail(`svlSearchOverviewPage`);
      await svlCommonNavigation.sidenav.expectSectionOpen(`rootNav:ml`); // remains open

      await expectNoPageReload();
    });

    it('active sidenav section is auto opened on load', async () => {
      await svlCommonNavigation.sidenav.openSection('rootNav:ml');
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'ml:notifications' });
      await browser.refresh();
      await testSubjects.existOrFail(`mlPageNotifications`);
      await svlCommonNavigation.sidenav.expectSectionOpen('rootNav:ml');
    });

    it('navigate using search', async () => {
      await svlCommonNavigation.search.showSearch();
      // TODO: test something search project specific instead of generic discover
      await svlCommonNavigation.search.searchFor('discover');
      await svlCommonNavigation.search.clickOnOption(0);
      await svlCommonNavigation.search.hideSearch();

      await expect(await browser.getCurrentUrl()).contain('/app/discover');
    });
  });
}
