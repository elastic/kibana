/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const svlSearchNavigation = getService('svlSearchNavigation');
  const testSubjects = getService('testSubjects');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const svlCommonPage = getPageObject('svlCommonPage');

  describe('empty pages', function () {
    // Error: expected testSubject(kbnOverviewElasticsearchGettingStarted) to exist
    this.tags(['failsOnMKI']);
    before(async () => {
      await svlCommonPage.login();
      await svlSearchNavigation.navigateToLandingPage();
    });

    after(async () => {
      await svlCommonPage.forceLogout();
    });

    it('should show search specific empty page in discover', async () => {
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'discover' });
      await testSubjects.existOrFail('~breadcrumb-deepLinkId-discover');
      await testSubjects.existOrFail('kbnOverviewElasticsearchGettingStarted');
      await testSubjects.click('kbnOverviewElasticsearchGettingStarted');
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Get started' });
    });

    it('should show search specific empty page in visualize', async () => {
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'visualize' });
      await testSubjects.existOrFail('~breadcrumb-deepLinkId-visualize');
      await testSubjects.existOrFail('kbnOverviewElasticsearchGettingStarted');
      await testSubjects.click('kbnOverviewElasticsearchGettingStarted');
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Get started' });
    });

    it('should show search specific empty page in dashboards', async () => {
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'dashboards' });
      await testSubjects.existOrFail('~breadcrumb-deepLinkId-dashboards');
      await testSubjects.existOrFail('kbnOverviewElasticsearchGettingStarted');
      await testSubjects.click('kbnOverviewElasticsearchGettingStarted');
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Get started' });
    });
  });
}
