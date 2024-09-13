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
  const esArchiver = getService('esArchiver');

  // Failing: See https://github.com/elastic/kibana/issues/192014
  describe.skip('Access to Management > Reporting', () => {
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

      await PageObjects.reporting.openExportTab();
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

    describe('Download report', () => {
      // use archived reports to allow reporting_user to view report jobs they've created
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/reporting/archived_reports');

        await reportingFunctional.loginReportingUser();
        await PageObjects.common.navigateToApp('reporting');
        await testSubjects.existOrFail('reportJobListing');
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/reporting/archived_reports');
      });

      it('user can access download link', async () => {
        await testSubjects.existOrFail('reportDownloadLink-kraz9db6154g0763b5141viu');
      });

      it('user can access download link for export type that is no longer supported', async () => {
        // The "csv" export type, aka CSV V1, was removed and can no longer be created.
        // Downloading a report of this export type does still work
        await testSubjects.existOrFail('reportDownloadLink-krb7arhe164k0763b50bjm31');
      });
    });
  });
};
