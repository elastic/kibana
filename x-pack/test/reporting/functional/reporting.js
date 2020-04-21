/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { checkIfPngsMatch } from './lib';

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

const REPORTS_FOLDER = path.resolve(__dirname, 'reports');

/*
 * TODO Remove this file and spread the tests to various apps
 */

export default function({ getService, getPageObjects }) {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const log = getService('log');
  const config = getService('config');
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects([
    'reporting',
    'common',
    'dashboard',
    'header',
    'discover',
    'visualize',
    'visEditor',
  ]);

  describe('Reporting', () => {
    describe('Dashboard', () => {
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
        it('downloads a PDF file', async function() {
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
        it('matches baseline report', async function() {
          const writeSessionReport = async (name, rawPdf, reportExt) => {
            const sessionDirectory = path.resolve(REPORTS_FOLDER, 'session');
            await mkdirAsync(sessionDirectory, { recursive: true });
            const sessionReportPath = path.resolve(sessionDirectory, `${name}.${reportExt}`);
            await writeFileAsync(sessionReportPath, rawPdf);
            return sessionReportPath;
          };
          const getBaselineReportPath = (fileName, reportExt) => {
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

    describe('Discover', () => {
      before('initialize tests', async () => {
        log.debug('ReportingPage:initTests');
        await esArchiver.loadIfNeeded('reporting/ecommerce');
        await browser.setWindowSize(1600, 850);
      });
      after('clean up archives', async () => {
        await esArchiver.unload('reporting/ecommerce');
      });

      describe('Generate CSV button', () => {
        beforeEach(() => PageObjects.common.navigateToApp('discover'));

        it('is not available if new', async () => {
          await PageObjects.reporting.openCsvReportingPanel();
          expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be('true');
        });

        it('becomes available when saved', async () => {
          await PageObjects.discover.saveSearch('my search - expectEnabledGenerateReportButton');
          await PageObjects.reporting.openCsvReportingPanel();
          expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
        });

        it('becomes available/not available when a saved search is created, changed and saved again', async () => {
          // create new search, csv export is not available
          await PageObjects.discover.clickNewSearchButton();
          await PageObjects.reporting.openCsvReportingPanel();
          expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be('true');
          // save search, csv export is available
          await PageObjects.discover.saveSearch('my search - expectEnabledGenerateReportButton 2');
          await PageObjects.reporting.openCsvReportingPanel();
          expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
          // add filter, csv export is not available
          await filterBar.addFilter('currency', 'is', 'EUR');
          await PageObjects.reporting.openCsvReportingPanel();
          expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be('true');
          // save search again, csv export is available
          await PageObjects.discover.saveSearch('my search - expectEnabledGenerateReportButton 2');
          await PageObjects.reporting.openCsvReportingPanel();
          expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
        });

        it('generates a report with data', async () => {
          await PageObjects.discover.clickNewSearchButton();
          await PageObjects.reporting.setTimepickerInDataRange();
          await PageObjects.discover.saveSearch('my search - with data - expectReportCanBeCreated');
          await PageObjects.reporting.openCsvReportingPanel();
          expect(await PageObjects.reporting.canReportBeCreated()).to.be(true);
        });

        it('generates a report with no data', async () => {
          await PageObjects.reporting.setTimepickerInNoDataRange();
          await PageObjects.discover.saveSearch('my search - no data - expectReportCanBeCreated');
          await PageObjects.reporting.openCsvReportingPanel();
          expect(await PageObjects.reporting.canReportBeCreated()).to.be(true);
        });
      });
    });

    describe('Visualize', () => {
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
          await PageObjects.common.navigateToUrl('visualize', 'new');
          await PageObjects.visualize.clickAreaChart();
          await PageObjects.visualize.clickNewSearch('ecommerce');
          await PageObjects.reporting.openPdfReportingPanel();
          expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be('true');
        });

        it('becomes available when saved', async () => {
          await PageObjects.reporting.setTimepickerInDataRange();
          await PageObjects.visEditor.clickBucket('X-axis');
          await PageObjects.visEditor.selectAggregation('Date Histogram');
          await PageObjects.visEditor.clickGo();
          await PageObjects.visualize.saveVisualization('my viz');
          await PageObjects.reporting.openPdfReportingPanel();
          expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
        });

        it('downloaded PDF has OK status', async function() {
          // Generating and then comparing reports can take longer than the default 60s timeout because the comparePngs
          // function is taking about 15 seconds per comparison in jenkins.
          this.timeout(180000);

          await PageObjects.common.navigateToApp('dashboard');
          await PageObjects.dashboard.loadSavedDashboard('Ecom Dashboard');
          await PageObjects.reporting.openPdfReportingPanel();
          await PageObjects.reporting.clickGenerateReportButton();

          const url = await PageObjects.reporting.getReportURL(60000);
          const res = await PageObjects.reporting.getResponse(url);

          expect(res.statusCode).to.equal(200);
          expect(res.headers['content-type']).to.equal('application/pdf');
        });
      });
    });
  });
}
