/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { FtrProviderContext } from '../../ftr_provider_context';

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const REPORTS_FOLDER = path.resolve(__dirname, 'reports');

const writeSessionReport = async (name: string, rawPdf: Buffer, reportExt: string) => {
  const sessionDirectory = path.resolve(REPORTS_FOLDER, 'session');
  await mkdirAsync(sessionDirectory, { recursive: true });
  const sessionReportPath = path.resolve(sessionDirectory, `${name}.${reportExt}`);
  await writeFileAsync(sessionReportPath, rawPdf);
  return sessionReportPath;
};
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['reporting', 'common', 'dashboard']);
  const log = getService('log');

  describe('dashboard reporting', () => {
    it('creates a map report', async function () {
      this.timeout(300000);

      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard('map embeddable example');
      await PageObjects.reporting.openPngReportingPanel();
      await PageObjects.reporting.clickGenerateReportButton();

      const url = await PageObjects.reporting.getReportURL(60000);
      const reportData = await PageObjects.reporting.getRawPdfReportData(url);

      const sessionReportPath = await writeSessionReport('example_report', reportData, 'png');
      log.info(`session report path: ${sessionReportPath}`);

      expect(sessionReportPath).not.to.be(null);
    });
  });
}
