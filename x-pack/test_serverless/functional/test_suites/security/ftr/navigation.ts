/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AppDeepLinkId } from '@kbn/core-chrome-browser';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const svlCommonPage = getPageObject('svlCommonPage');
  const svlSecLandingPage = getPageObject('svlSecLandingPage');
  const svlSecNavigation = getService('svlSecNavigation');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  describe('navigation', function () {
    before(async () => {
      await svlCommonPage.login();
      await svlSecNavigation.navigateToLandingPage();
    });

    after(async () => {
      await svlCommonPage.forceLogout();
    });

    it('has security serverless side nav', async () => {
      await svlSecLandingPage.assertSvlSecSideNavExists();
      await svlCommonNavigation.expectExists();
    });

    it('breadcrumbs reflect navigation state', async () => {
      await svlCommonNavigation.breadcrumbs.expectExists();
      // TODO: use `deepLinkId` instead of `text`, once security deep links are available in @kbn/core-chrome-browser
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Get started' });
      await svlCommonNavigation.sidenav.clickLink({
        deepLinkId: 'securitySolutionUI:alerts' as AppDeepLinkId,
      });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Alerts' });
      await svlCommonNavigation.clickLogo();
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Get started' });
    });

    it('navigate using search', async () => {
      await svlCommonNavigation.search.showSearch();
      await svlCommonNavigation.search.searchFor('security dashboards');
      await svlCommonNavigation.search.clickOnOption(0);
      await svlCommonNavigation.search.hideSearch();

      await expect(await browser.getCurrentUrl()).contain('app/security/dashboards');
    });

    it('shows cases in sidebar navigation', async () => {
      await svlSecLandingPage.assertSvlSecSideNavExists();
      await svlCommonNavigation.expectExists();

      await svlCommonNavigation.sidenav.expectLinkExists({
        deepLinkId: 'securitySolutionUI:cases' as AppDeepLinkId,
      });
    });

    it('navigates to cases app', async () => {
      await svlCommonNavigation.sidenav.clickLink({
        deepLinkId: 'securitySolutionUI:cases' as AppDeepLinkId,
      });

      expect(await browser.getCurrentUrl()).contain('/app/security/cases');
      await testSubjects.existOrFail('cases-all-title');
    });
  });
}
