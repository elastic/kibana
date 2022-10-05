/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import path from 'path';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'reporting', 'dashboard']);
  const reportingAPI = getService('reportingAPI');
  const reportingFunctional = getService('reportingFunctional');
  const browser = getService('browser');
  const png = getService('png');
  const config = getService('config');
  const screenshotDir = config.get('screenshots.directory');

  // FLAKY: https://github.com/elastic/kibana/issues/135309
  describe.skip('Reporting Functional Tests with forced timeout', function () {
    const dashboardTitle = 'Ecom Dashboard Hidden Panel Titles';
    const baselineAPng = path.resolve(__dirname, 'fixtures/baseline/warnings_capture_a.png');
    const sessionPng = 'warnings_capture_session_a';

    let url: string;
    before(async () => {
      await reportingAPI.logTaskManagerHealth();
      await reportingFunctional.initEcommerce();

      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard(dashboardTitle);
      await PageObjects.reporting.setTimepickerInEcommerceDataRange();
      await browser.setWindowSize(1600, 850);

      await PageObjects.reporting.openPngReportingPanel();
      await PageObjects.reporting.clickGenerateReportButton();

      url = await PageObjects.reporting.getReportURL(60000);

      const res = await PageObjects.reporting.getResponse(url);
      expect(res.status).to.equal(200);
      expect(res.get('content-type')).to.equal('image/png');
    });

    after(async () => {
      await reportingFunctional.teardownEcommerce();
    });

    it('adds a visual warning in the report output', async () => {
      const captureData = await PageObjects.reporting.getRawPdfReportData(url);
      const pngSessionFilePath = await PageObjects.reporting.writeSessionReport(
        sessionPng,
        'png',
        captureData,
        screenshotDir
      );

      // allow minor visual differences: https://github.com/elastic/kibana/issues/135309#issuecomment-1169095186
      expect(
        await png.checkIfPngsMatch(pngSessionFilePath, baselineAPng, screenshotDir)
      ).to.be.lessThan(0.015); // this factor of difference allows passing whether or not the page has loaded things like the loading graphics and titlebars
    });
  });
}
