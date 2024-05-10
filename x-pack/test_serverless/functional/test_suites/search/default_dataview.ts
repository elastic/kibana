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

  describe('default dataView', function () {
    before(async () => {
      await svlCommonPage.login();
      await svlSearchNavigation.navigateToLandingPage();
    });

    after(async () => {
      await svlCommonPage.forceLogout();
    });

    it('should show dashboard but with no data', async () => {
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'discover' });
      await testSubjects.existOrFail('~breadcrumb-deepLinkId-discover');
      await testSubjects.existOrFail('discover-dataView-switch-link');
      await testSubjects.click('discover-dataView-switch-link');
      await testSubjects.existOrFail('indexPattern-add-field');
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Discover' });
    });

    it('should show dashboard but with no data in dashboard', async () => {
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'dashboards' });
      await testSubjects.existOrFail('~breadcrumb-deepLinkId-dashboards');
      await testSubjects.existOrFail('emptyListPrompt');
      await testSubjects.click('newItemButton');
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({
        text: 'Editing New Dashboard',
      });
    });
  });
}
