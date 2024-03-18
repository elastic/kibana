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
  const testSubjects = getService('testSubjects');

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

      // navigate to the logs explorer tab by default
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'observability-logs-explorer' });
      await svlCommonNavigation.sidenav.expectLinkActive({
        deepLinkId: 'observability-logs-explorer',
      });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'observability-logs-explorer',
      });
      expect(await browser.getCurrentUrl()).contain('/app/observability-logs-explorer');

      // check the aiops subsection
      await svlCommonNavigation.sidenav.openSection('observability_project_nav.aiops'); // open ai ops subsection
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'ml:anomalyDetection' });
      await svlCommonNavigation.sidenav.expectLinkActive({ deepLinkId: 'ml:anomalyDetection' });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'AIOps' });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'ml:anomalyDetection',
      });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({
        text: 'Jobs',
      });
      await testSubjects.click('mlCreateNewJobButton');
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbTexts([
        'AIOps',
        'Anomaly Detection',
        'Create job',
      ]);

      // navigate to a different section
      await svlCommonNavigation.sidenav.openSection('project_settings_project_nav');
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'management' });
      await svlCommonNavigation.sidenav.expectLinkActive({ deepLinkId: 'management' });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ deepLinkId: 'management' });

      // navigate back to serverless oblt overview
      await svlCommonNavigation.clickLogo();
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
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbTexts(['Cases']);

      await testSubjects.click('createNewCaseBtn');
      expect(await browser.getCurrentUrl()).contain('app/observability/cases/create');
      await svlCommonNavigation.sidenav.expectLinkActive({
        deepLinkId: 'observability-overview:cases',
      });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbTexts(['Cases', 'Create']);

      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'observability-overview:cases' });

      await testSubjects.click('configure-case-button');
      expect(await browser.getCurrentUrl()).contain('app/observability/cases/configure');
      await svlCommonNavigation.sidenav.expectLinkActive({
        deepLinkId: 'observability-overview:cases',
      });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbTexts(['Cases', 'Settings']);
    });

    it('navigates to alerts app', async () => {
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'observability-overview:alerts' });
      await svlCommonNavigation.sidenav.expectLinkActive({
        deepLinkId: 'observability-overview:alerts',
      });
      await testSubjects.click('manageRulesPageButton');
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbTexts(['Alerts', 'Rules']);
      await svlCommonNavigation.sidenav.expectLinkActive({
        deepLinkId: 'observability-overview:alerts',
      });
    });

    it('navigates to integrations', async () => {
      await svlCommonNavigation.sidenav.openSection('project_settings_project_nav');
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'integrations' });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbTexts([
        'Integrations',
        'Browse integrations',
      ]);
    });

    it('navigates to fleet', async () => {
      await svlCommonNavigation.sidenav.openSection('project_settings_project_nav');
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'fleet' });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbTexts(['Fleet', 'Agents']);
    });
  });
}
