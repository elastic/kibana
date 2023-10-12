/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const svlObltOnboardingPage = getPageObject('svlObltOnboardingPage');
  const svlObltNavigation = getService('svlObltNavigation');
  const svlCommonPage = getPageObject('svlCommonPage');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const browser = getService('browser');

  describe('navigation', function () {
    before(async () => {
      await svlCommonPage.login();
      await svlObltNavigation.navigateToLandingPage();
    });

    after(async () => {
      await svlCommonPage.forceLogout();
    });

    it('navigate observability sidenav & breadcrumbs', async () => {
      const expectNoPageReload = await svlCommonNavigation.createNoPageReloadCheck();

      // check serverless search side nav exists
      await svlCommonNavigation.expectExists();
      await svlCommonNavigation.breadcrumbs.expectExists();
      await svlObltOnboardingPage.assertQuickstartBadgeExists();

      // check side nav links
      await svlCommonNavigation.sidenav.expectSectionOpen('observability_project_nav');
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'observabilityOnboarding',
      });
      await svlCommonNavigation.sidenav.expectSectionClosed('project_settings_project_nav');

      // navigate to log explorer
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'observability-log-explorer' });
      await svlCommonNavigation.sidenav.expectLinkActive({
        deepLinkId: 'observability-log-explorer',
      });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'observability-log-explorer',
      });
      await expect(await browser.getCurrentUrl()).contain('/app/observability-log-explorer');

      // check the aiops subsection
      await svlCommonNavigation.sidenav.clickLink({ navId: 'aiops' }); // open ai ops subsection
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'ml:anomalyDetection' });
      await svlCommonNavigation.sidenav.expectLinkActive({ deepLinkId: 'ml:anomalyDetection' });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'AIOps' });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'ml:anomalyDetection',
      });

      // navigate to a different section
      await svlCommonNavigation.sidenav.openSection('project_settings_project_nav');
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'management' });
      await svlCommonNavigation.sidenav.expectLinkActive({ deepLinkId: 'management' });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ deepLinkId: 'management' });

      // navigate back to serverless oblt overview
      await svlCommonNavigation.breadcrumbs.clickHome();
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'observabilityOnboarding',
      });
      await svlCommonNavigation.sidenav.expectSectionOpen(`project_settings_project_nav`); // remains open

      await expectNoPageReload();
    });

    it('active sidenav section is auto opened on load', async () => {
      await svlCommonNavigation.sidenav.openSection('project_settings_project_nav');
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'management' });
      await browser.refresh();
      await svlCommonNavigation.expectExists();
      await svlCommonNavigation.sidenav.expectSectionOpen('project_settings_project_nav');
    });

    it('shows cases in sidebar navigation', async () => {
      await svlCommonNavigation.expectExists();

      await svlCommonNavigation.sidenav.expectLinkExists({
        deepLinkId: 'observability-overview:cases',
      });
    });

    it('navigates to cases app', async () => {
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'observability-overview:cases' });

      await svlCommonNavigation.sidenav.expectLinkActive({
        deepLinkId: 'observability-overview:cases',
      });
      expect(await browser.getCurrentUrl()).contain('/app/observability/cases');
    });
  });
}
