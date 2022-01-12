/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import path from 'path';
import { FtrProviderContext } from '../../ftr_provider_context';

const REPORTS_FOLDER = path.resolve(__dirname, 'reports');

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['reporting', 'common', 'dashboard']);
  const config = getService('config');
  const log = getService('log');
  const reporting = getService('reporting');

  describe('dashboard reporting', () => {
    it('creates a map report', async function () {
      this.timeout(300000);

      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard('map embeddable example');
      await PageObjects.reporting.openPngReportingPanel();
      await PageObjects.reporting.clickGenerateReportButton();

      const url = await PageObjects.reporting.getReportURL(60000);
      const reportData = await PageObjects.reporting.getRawPdfReportData(url);

      const sessionReportPath = await PageObjects.reporting.writeSessionReport(
        'example_map_report',
        'png',
        reportData,
        REPORTS_FOLDER
      );
      log.debug(`session report path: ${sessionReportPath}`);

      expect(sessionReportPath).not.to.be(null);
      const percentDiff = await reporting.checkIfPngsMatch(
        sessionReportPath,
        PageObjects.reporting.getBaselineReportPath('example_map_report', 'png', REPORTS_FOLDER),
        config.get('screenshots.directory'),
        log
      );

      expect(percentDiff).to.be.lessThan(0.09);
    });
  });
}
