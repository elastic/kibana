/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const PageObjects = getPageObjects(['common', 'reporting', 'dashboard']);
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const reportingFunctional = getService('reportingFunctional');

  describe('Access to Management > Reporting', () => {
    before(async () => {
      await reportingFunctional.initEcommerce();
    });
    after(async () => {
      await reportingFunctional.teardownEcommerce();
    });

    it('does not allow user that does not have reporting privileges', async () => {
      await reportingFunctional.loginDataAnalyst();
      await PageObjects.common.navigateToApp('reporting');
      await testSubjects.missingOrFail('reportJobListing');
    });

    it('does allow user with reporting privileges', async () => {
      await reportingFunctional.loginReportingUser();
      await PageObjects.common.navigateToApp('reporting');
      await testSubjects.existOrFail('reportJobListing');
    });

    it('Allows users to navigate back to where a report was generated', async () => {
      const dashboardTitle = 'Ecom Dashboard';
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard(dashboardTitle);

      await PageObjects.reporting.openPdfReportingPanel();
      await PageObjects.reporting.clickGenerateReportButton();

      await PageObjects.common.navigateToApp('reporting');
      await PageObjects.common.sleep(3000); // Wait an amount of time for auto-polling to refresh the jobs

      // We do not need to wait for the report to finish generating
      await (await testSubjects.find('euiCollapsedItemActionsButton')).click();
      await (await testSubjects.find('reportOpenInKibanaApp')).click();

      const [, dashboardWindowHandle] = await browser.getAllWindowHandles();
      await browser.switchToWindow(dashboardWindowHandle);

      await PageObjects.dashboard.expectOnDashboard(dashboardTitle);
    });
  });
};
