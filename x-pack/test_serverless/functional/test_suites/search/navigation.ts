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

    it('navigate serverless sidenav & breadcrumbs', async () => {
      const expectNoPageReload = await svlCommonNavigation.createNoPageReloadCheck();

      // check serverless search side nav exists
      await svlCommonNavigation.expectExists();
      await svlCommonNavigation.breadcrumbs.expectExists();
      await svlSearchLandingPage.assertSvlSearchSideNavExists();

      // check side nav links
      await testSubjects.existOrFail(`svlSearchOverviewPage`);
      await svlCommonNavigation.sidenav.expectSectionOpen('search_project_nav');
      await svlCommonNavigation.sidenav.expectDeepLinkActive('serverlessElasticsearch');
      await svlCommonNavigation.breadcrumbs.expectExistsByDeepLink('serverlessElasticsearch');
      await svlCommonNavigation.sidenav.expectSectionClosed('rootNav:ml');

      // navigate to discover
      await svlCommonNavigation.sidenav.clickDeepLink('discover');
      await svlCommonNavigation.sidenav.expectDeepLinkActive('discover');
      await svlCommonNavigation.breadcrumbs.expectExistsByText(`Explore`);
      await svlCommonNavigation.breadcrumbs.expectExistsByDeepLink('discover');
      await expect(await browser.getCurrentUrl()).contain('/app/discover');

      // navigate to a different section
      await svlCommonNavigation.sidenav.openSection('rootNav:ml');
      await svlCommonNavigation.sidenav.clickDeepLink('ml:notifications');
      await svlCommonNavigation.sidenav.expectDeepLinkActive('ml:notifications');
      await svlCommonNavigation.breadcrumbs.expectExistsByText(`Machine Learning`);
      await svlCommonNavigation.breadcrumbs.expectExistsByDeepLink('ml:notifications');
      await testSubjects.existOrFail(`mlPageNotifications`);

      // navigate back to serverless search overview
      await svlCommonNavigation.breadcrumbs.clickHome();
      await svlCommonNavigation.sidenav.expectDeepLinkActive('serverlessElasticsearch');
      await svlCommonNavigation.breadcrumbs.expectExistsByText(`Getting started`);
      await testSubjects.existOrFail(`svlSearchOverviewPage`);
      await svlCommonNavigation.sidenav.expectSectionOpen(`rootNav:ml`); // remains open

      await expectNoPageReload();
    });

    it('active sidenav section is auto opened on load', async () => {
      await svlCommonNavigation.sidenav.openSection('rootNav:ml');
      await svlCommonNavigation.sidenav.clickDeepLink('ml:notifications');
      await browser.refresh();
      await testSubjects.existOrFail(`mlPageNotifications`);
      await svlCommonNavigation.sidenav.expectSectionOpen('rootNav:ml');
    });

    it('navigate using search', async () => {
      await svlCommonNavigation.search.showSearch();
      await svlCommonNavigation.search.searchFor('discover');
      await svlCommonNavigation.search.clickOnOption(0);
      await svlCommonNavigation.search.hideSearch();

      await expect(await browser.getCurrentUrl()).contain('/app/discover');
    });
  });
}
