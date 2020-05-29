/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { checkIfPngsMatch } from './lib/compare_pngs';

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

const REPORTS_FOLDER = path.resolve(__dirname, 'reports');

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const log = getService('log');
  const config = getService('config');
  const PageObjects = getPageObjects(['reporting', 'common', 'dashboard']);

  describe('Screenshots', () => {
    before('initialize tests', async () => {
      log.debug('ReportingPage:initTests');
      await esArchiver.loadIfNeeded('reporting/ecommerce');
      await esArchiver.loadIfNeeded('reporting/ecommerce_kibana');
      await browser.setWindowSize(1600, 850);
    });
    after('clean up archives', async () => {
      await esArchiver.unload('reporting/ecommerce');
      await esArchiver.unload('reporting/ecommerce_kibana');
    });

    describe('Print PDF button', () => {
      it('is not available if new', async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.reporting.openPdfReportingPanel();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be('true');
      });

      it('becomes available when saved', async () => {
        await PageObjects.dashboard.saveDashboard('My PDF Dashboard');
        await PageObjects.reporting.openPdfReportingPanel();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
      });
    });

    describe('Print Layout', () => {
      it('downloads a PDF file', async function () {
        // Generating and then comparing reports can take longer than the default 60s timeout because the comparePngs
        // function is taking about 15 seconds per comparison in jenkins.
        this.timeout(300000);
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('Ecom Dashboard');
        await PageObjects.reporting.openPdfReportingPanel();
        await PageObjects.reporting.checkUsePrintLayout();
        await PageObjects.reporting.clickGenerateReportButton();

        const url = await PageObjects.reporting.getReportURL(60000);
        const res = await PageObjects.reporting.getResponse(url);

        expect(res.statusCode).to.equal(200);
        expect(res.headers['content-type']).to.equal('application/pdf');
      });
    });

    describe('Print PNG button', () => {
      it('is not available if new', async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.reporting.openPngReportingPanel();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be('true');
      });

      it('becomes available when saved', async () => {
        await PageObjects.dashboard.saveDashboard('My PNG Dash');
        await PageObjects.reporting.openPngReportingPanel();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
      });
    });

    describe('Preserve Layout', () => {
      it('matches baseline report', async function () {
        const writeSessionReport = async (name: string, rawPdf: Buffer, reportExt: string) => {
          const sessionDirectory = path.resolve(REPORTS_FOLDER, 'session');
          await mkdirAsync(sessionDirectory, { recursive: true });
          const sessionReportPath = path.resolve(sessionDirectory, `${name}.${reportExt}`);
          await writeFileAsync(sessionReportPath, rawPdf);
          return sessionReportPath;
        };
        const getBaselineReportPath = (fileName: string, reportExt: string) => {
          const baselineFolder = path.resolve(REPORTS_FOLDER, 'baseline');
          const fullPath = path.resolve(baselineFolder, `${fileName}.${reportExt}`);
          log.debug(`getBaselineReportPath (${fullPath})`);
          return fullPath;
        };

        this.timeout(300000);

        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('Ecom Dashboard');
        await PageObjects.reporting.openPngReportingPanel();
        await PageObjects.reporting.forceSharedItemsContainerSize({ width: 1405 });
        await PageObjects.reporting.clickGenerateReportButton();
        await PageObjects.reporting.removeForceSharedItemsContainerSize();

        const url = await PageObjects.reporting.getReportURL(60000);
        const reportData = await PageObjects.reporting.getRawPdfReportData(url);
        const reportFileName = 'dashboard_preserve_layout';
        const sessionReportPath = await writeSessionReport(reportFileName, reportData, 'png');
        const percentSimilar = await checkIfPngsMatch(
          sessionReportPath,
          getBaselineReportPath(reportFileName, 'png'),
          config.get('screenshots.directory'),
          log
        );

        expect(percentSimilar).to.be.lessThan(0.1);
      });
    });
  });
}
