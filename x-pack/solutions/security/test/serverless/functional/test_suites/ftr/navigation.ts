/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { AppDeepLinkId } from '@kbn/core-chrome-browser';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const svlCommonPage = getPageObject('svlCommonPage');
  const svlSecLandingPage = getPageObject('svlSecLandingPage');
  const svlSecNavigation = getService('svlSecNavigation');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const headerPage = getPageObject('header');
  const retry = getService('retry');

  describe('navigation', function () {
    before(async () => {
      await svlCommonPage.loginWithPrivilegedRole();
      await svlSecNavigation.navigateToLandingPage();
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
      await headerPage.waitUntilLoadingHasFinished();

      expect(await browser.getCurrentUrl()).contain('app/security/dashboards');
    });

    it('shows cases in sidebar navigation', async () => {
      await svlSecLandingPage.assertSvlSecSideNavExists();
      await svlCommonNavigation.expectExists();

      await svlCommonNavigation.sidenav.expectLinkExists({
        deepLinkId: 'securitySolutionUI:cases' as AppDeepLinkId,
      });
    });

    it('navigates to cases app', async () => {
      await retry.tryForTime(30 * 1000, async () => {
        // start navigation to the cases app from the landing page
        await svlSecNavigation.navigateToLandingPage();
        await svlCommonNavigation.sidenav.clickLink({
          deepLinkId: 'securitySolutionUI:cases' as AppDeepLinkId,
        });
        await headerPage.waitUntilLoadingHasFinished();

        expect(await browser.getCurrentUrl()).contain('/app/security/cases');
        await testSubjects.existOrFail('cases-all-title');
      });
    });

    it('navigates to maintenance windows', async () => {
      await svlCommonPage.loginAsAdmin();
      await svlSecNavigation.navigateToLandingPage();
      await svlCommonNavigation.sidenav.clickLink({ navId: 'stack_management' });
      await svlCommonNavigation.sidenav.clickPanelLink('management:maintenanceWindows');
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({
        text: 'Maintenance Windows',
      });
    });

    it('renders a feedback callout', async () => {
      await svlCommonNavigation.sidenav.feedbackCallout.reset();
      await svlCommonNavigation.sidenav.feedbackCallout.expectExists();
      await svlCommonNavigation.sidenav.feedbackCallout.dismiss();
      await svlCommonNavigation.sidenav.feedbackCallout.expectMissing();
      await browser.refresh();
      await svlCommonNavigation.sidenav.feedbackCallout.expectMissing();
    });

    it('renders tour', async () => {
      await svlCommonNavigation.sidenav.tour.reset();
      await svlCommonNavigation.sidenav.tour.expectTourStepVisible('sidenav-home');
      await svlCommonNavigation.sidenav.tour.nextStep();
      // TODO: "more" step is currently flaky in security due to initial rendering without "more" button
      // https://github.com/elastic/kibana/issues/239331
      if (await svlCommonNavigation.sidenav.tour.isTourStepVisible('sidenav-more')) {
        await svlCommonNavigation.sidenav.tour.nextStep();
      }
      await svlCommonNavigation.sidenav.tour.expectTourStepVisible('sidenav-manage-data');
      await svlCommonNavigation.sidenav.tour.nextStep();
      await svlCommonNavigation.sidenav.tour.expectHidden();
      await browser.refresh();
      await svlCommonNavigation.sidenav.tour.expectHidden();
    });
  });
}
