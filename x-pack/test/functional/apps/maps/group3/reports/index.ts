/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

const REPORTS_FOLDER = __dirname;

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['reporting', 'common', 'dashboard']);
  const browser = getService('browser');
  const config = getService('config');
  const log = getService('log');
  const reporting = getService('reporting');
  const png = getService('png');

  // NOTE: Occasionally, you may need to run the test and copy the "session" image file and replace the
  // "baseline" image file to reflect current renderings. The source and destination file paths can be found in
  // the debug logs.
  describe('dashboard reporting: creates a map report', () => {
    // helper function to check the difference between the new image and the baseline
    const measurePngDifference = async (fileName: string) => {
      const url = await PageObjects.reporting.getReportURL(60000);
      const reportData = await PageObjects.reporting.getRawPdfReportData(url);

      const sessionReportPath = await PageObjects.reporting.writeSessionReport(
        fileName,
        'png',
        reportData,
        REPORTS_FOLDER
      );
      expect(sessionReportPath).not.to.be(null);

      const baselineReportPath = PageObjects.reporting.getBaselineReportPath(
        fileName,
        'png',
        REPORTS_FOLDER
      );
      log.debug(`session report path: ${sessionReportPath}`);
      log.debug(`baseline report path: ${baselineReportPath}`);

      return await png.checkIfPngsMatch(
        sessionReportPath,
        baselineReportPath,
        config.get('screenshots.directory')
      );
    };

    before(async () => {
      await browser.setWindowSize(1600, 1000);
    });

    after(async () => {
      await reporting.deleteAllReports();
    });

    it('PNG file matches the baseline image, using sample geo data', async function () {
      await reporting.initEcommerce();

      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.loadSavedDashboard('Ecommerce Map');
      await PageObjects.reporting.openPngReportingPanel();
      await PageObjects.reporting.clickGenerateReportButton();

      const percentDiff = await measurePngDifference('geo_map_report');
      expect(percentDiff).to.be.lessThan(0.03);

      await reporting.teardownEcommerce();
    });

    it('PNG file matches the baseline image, using embeddable example', async function () {
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.loadSavedDashboard('map embeddable example');
      await PageObjects.reporting.openPngReportingPanel();
      await PageObjects.reporting.clickGenerateReportButton();

      const percentDiff = await measurePngDifference('example_map_report');
      expect(percentDiff).to.be.lessThan(0.03);
    });
  });
}
