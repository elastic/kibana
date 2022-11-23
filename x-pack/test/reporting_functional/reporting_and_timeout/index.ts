/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'reporting', 'dashboard']);
  const log = getService('log');
  const reportingAPI = getService('reportingAPI');
  const reportingFunctional = getService('reportingFunctional');
  const browser = getService('browser');
  const png = getService('png');
  const config = getService('config');
  const screenshotDir = config.get('screenshots.directory');

  // FLAKY: https://github.com/elastic/kibana/issues/135309
  describe.skip('Reporting Functional Tests with forced timeout', function () {
    const dashboardTitle = 'Ecom Dashboard Hidden Panel Titles';
    const sessionPngFullPage = 'warnings_capture_session_a';
    const sessionPngCropped = 'warnings_capture_session_b';
    const baselinePng = path.resolve(__dirname, 'fixtures/baseline/warnings_capture_b.png');

    let url: string;
    before(async () => {
      await reportingAPI.logTaskManagerHealth();
      await reportingFunctional.initEcommerce();

      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard(dashboardTitle);
      await PageObjects.reporting.setTimepickerInEcommerceDataRange();
      await browser.setWindowSize(800, 850);

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
      const sessionReport = await PageObjects.reporting.writeSessionReport(
        sessionPngFullPage,
        'png',
        captureData,
        screenshotDir
      );

      const region = { height: 320, width: 1540, srcX: 20, srcY: 10 };
      const dstPath = path.resolve(screenshotDir, sessionPngCropped + '.png');
      const dst = new PNG({ width: region.width, height: region.height });

      const pngSessionFilePath = await new Promise<string>((resolve) => {
        fs.createReadStream(sessionReport)
          .pipe(new PNG())
          .on('parsed', function () {
            log.info(`cropping report to the visual warning area`);
            this.bitblt(dst, region.srcX, region.srcY, region.width, region.height, 0, 0);
            dst.pack().pipe(fs.createWriteStream(dstPath));
            resolve(dstPath);
          });
      });

      log.info(`saved cropped file to ${dstPath}`);

      expect(
        await png.checkIfPngsMatch(pngSessionFilePath, baselinePng, screenshotDir)
      ).to.be.lessThan(0.09);

      /**
       * This test may fail when styling differences affect the result. To update the snapshot:
       *
       * 1. Run the functional test, to generate new temporary files for screenshot comparison.
       * 2. Save the screenshot as the new baseline file:
       *      cp \
       *       x-pack/test/functional/screenshots/session/warnings_capture_session_b_actual.png \
       *       x-pack/test/reporting_functional/reporting_and_timeout/fixtures/baseline/warnings_capture_b.png
       * 3. Commit the changes to the .png file
       */
    });
  });
}
