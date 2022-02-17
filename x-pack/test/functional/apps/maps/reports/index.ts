/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const REPORTS_FOLDER = __dirname;

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['reporting', 'common', 'dashboard']);
  const config = getService('config');
  const log = getService('log');
  const reporting = getService('reporting');

  describe('dashboard reporting', () => {
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
      log.debug(`session report path: ${sessionReportPath}`);

      expect(sessionReportPath).not.to.be(null);
      return await reporting.checkIfPngsMatch(
        sessionReportPath,
        PageObjects.reporting.getBaselineReportPath(fileName, 'png', REPORTS_FOLDER),
        config.get('screenshots.directory'),
        log
      );
    };

    after(async () => {
      await reporting.deleteAllReports();
    });

    it('creates a map report using sample geo data', async function () {
      await reporting.initEcommerce();

      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard('Ecommerce Map');
      await PageObjects.reporting.openPngReportingPanel();
      await PageObjects.reporting.clickGenerateReportButton();

      const percentDiff = await measurePngDifference('geo_map_report');
      expect(percentDiff).to.be.lessThan(0.09);

      await reporting.teardownEcommerce();
    });

    it('creates a map report using embeddable example', async function () {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard('map embeddable example');
      await PageObjects.reporting.openPngReportingPanel();
      await PageObjects.reporting.clickGenerateReportButton();

      const percentDiff = await measurePngDifference('example_map_report');
      expect(percentDiff).to.be.lessThan(0.09);
    });
  });
}
