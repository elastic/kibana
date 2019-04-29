/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import path from 'path';
import mkdirp from 'mkdirp';
import fs from 'fs';
import { promisify } from 'bluebird';
import { checkIfPdfsMatch, checkIfPngsMatch } from './lib';
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(mkdirp);

const REPORTS_FOLDER = path.resolve(__dirname, 'reports');

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const config = getService('config');
  const PageObjects = getPageObjects(['reporting', 'common', 'dashboard', 'header', 'discover', 'visualize']);
  const log = getService('log');

  describe('Reporting', () => {

    before('initialize tests', async () => {
      await PageObjects.reporting.initTests();
    });

    const expectDisabledGenerateReportButton = async () => {
      const generateReportButton = await PageObjects.reporting.getGenerateReportButton();
      await retry.try(async () => {
        const isDisabled = await generateReportButton.getProperty('disabled');
        expect(isDisabled).to.be(true);
      });
    };

    const expectEnabledGenerateReportButton = async () => {
      const generateReportButton = await PageObjects.reporting.getGenerateReportButton();
      await retry.try(async () => {
        const isDisabled = await generateReportButton.getProperty('disabled');
        expect(isDisabled).to.be(false);
      });
    };

    const expectReportCanBeCreated = async () => {
      await PageObjects.reporting.clickGenerateReportButton();
      const success = await PageObjects.reporting.checkForReportingToasts();
      expect(success).to.be(true);
    };

    const writeSessionReport = async (name, rawPdf, reportExt = 'pdf') => {
      const sessionDirectory = path.resolve(REPORTS_FOLDER, 'session');
      await mkdirAsync(sessionDirectory);
      const sessionReportPath = path.resolve(sessionDirectory, `${name}.${reportExt}`);
      await writeFileAsync(sessionReportPath, rawPdf);
      return sessionReportPath;
    };

    const getBaselineReportPath = (fileName, reportExt = 'pdf') => {
      const baselineFolder = path.resolve(REPORTS_FOLDER, 'baseline');
      return path.resolve(baselineFolder, `${fileName}.${reportExt}`);
    };

    describe('Dashboard', () => {
      beforeEach(() => PageObjects.reporting.clearToastNotifications());

      describe('Print PDF button', () => {
        it('is not available if new', async () => {
          await PageObjects.common.navigateToApp('dashboard');
          await PageObjects.dashboard.clickNewDashboard();
          await PageObjects.reporting.openPdfReportingPanel();
          await expectDisabledGenerateReportButton();
        });

        it('becomes available when saved', async () => {
          await PageObjects.dashboard.saveDashboard('mypdfdash');
          await PageObjects.reporting.openPdfReportingPanel();
          await expectEnabledGenerateReportButton();
        });
      });

      describe.skip('Print Layout', () => {
        it('matches baseline report', async function () {
          // Generating and then comparing reports can take longer than the default 60s timeout because the comparePngs
          // function is taking about 15 seconds per comparison in jenkins.
          this.timeout(360000);

          await PageObjects.dashboard.switchToEditMode();
          await PageObjects.reporting.setTimepickerInDataRange();
          const visualizations = PageObjects.dashboard.getTestVisualizationNames();

          // There is a current issue causing reports with tilemaps to timeout:
          // https://github.com/elastic/kibana/issues/14136. Once that is resolved, add the tilemap visualization
          // back in!
          const tileMapIndex = visualizations.indexOf('Visualization TileMap');
          visualizations.splice(tileMapIndex, 1);
          await PageObjects.dashboard.addVisualizations(visualizations);

          await PageObjects.dashboard.saveDashboard('report test');

          await PageObjects.reporting.openPdfReportingPanel();
          await PageObjects.reporting.checkUsePrintLayout();
          await PageObjects.reporting.clickGenerateReportButton();
          await PageObjects.reporting.clickDownloadReportButton(60000);
          PageObjects.reporting.clearToastNotifications();

          const url = await PageObjects.reporting.getUrlOfTab(1);
          await PageObjects.reporting.closeTab(1);
          const reportData = await PageObjects.reporting.getRawPdfReportData(url);
          const reportFileName = 'dashboard_print';
          const sessionReportPath = await writeSessionReport(reportFileName, reportData);
          const percentSimilar = await checkIfPdfsMatch(
            sessionReportPath,
            getBaselineReportPath(reportFileName),
            config.get('screenshots.directory'),
            log
          );
          // After expected OS differences, the diff count came to be around 128k
          expect(percentSimilar).to.be.lessThan(0.05);
        });

        it('matches same baseline report with margins turned on', async function () {
          // Generating and then comparing reports can take longer than the default 60s timeout because the comparePngs
          // function is taking about 15 seconds per comparison in jenkins.
          this.timeout(360000);

          await PageObjects.dashboard.switchToEditMode();
          await PageObjects.dashboard.useMargins(true);
          await PageObjects.dashboard.saveDashboard('report test');
          await PageObjects.reporting.openPdfReportingPanel();
          await PageObjects.reporting.checkUsePrintLayout();
          await PageObjects.reporting.clickGenerateReportButton();
          await PageObjects.reporting.clickDownloadReportButton(60000);
          PageObjects.reporting.clearToastNotifications();

          const url = await PageObjects.reporting.getUrlOfTab(1);
          const reportData = await PageObjects.reporting.getRawPdfReportData(url);

          await PageObjects.reporting.closeTab(1);
          const reportFileName = 'dashboard_print';
          const sessionReportPath = await writeSessionReport(reportFileName, reportData);
          const percentSimilar = await checkIfPdfsMatch(
            sessionReportPath,
            getBaselineReportPath(reportFileName),
            config.get('screenshots.directory'),
            log
          );
          // After expected OS differences, the diff count came to be around 128k
          expect(percentSimilar).to.be.lessThan(0.05);

        });
      });

      // TODO Re-enable the tests after removing Phantom:
      // https://github.com/elastic/kibana/issues/21485
      describe.skip('Preserve Layout', () => {
        it('matches baseline report', async function () {

          // Generating and then comparing reports can take longer than the default 60s timeout because the comparePngs
          // function is taking about 15 seconds per comparison in jenkins.
          this.timeout(360000);

          await PageObjects.reporting.openPdfReportingPanel();
          await PageObjects.reporting.forceSharedItemsContainerSize({ width: 1405 });
          await PageObjects.reporting.clickGenerateReportButton();
          await PageObjects.reporting.removeForceSharedItemsContainerSize();

          await PageObjects.reporting.clickDownloadReportButton(60000);
          PageObjects.reporting.clearToastNotifications();

          const url = await PageObjects.reporting.getUrlOfTab(1);
          await PageObjects.reporting.closeTab(1);
          const reportData = await PageObjects.reporting.getRawPdfReportData(url);

          const reportFileName = 'dashboard_preserve_layout';
          const sessionReportPath = await writeSessionReport(reportFileName, reportData);

          const percentSimilar = await checkIfPdfsMatch(
            sessionReportPath,
            getBaselineReportPath(reportFileName),
            config.get('screenshots.directory'),
            log
          );
          expect(percentSimilar).to.be.lessThan(0.05);

        });
      });

      describe('Print PNG button', () => {
        it('is not available if new', async () => {
          await PageObjects.common.navigateToApp('dashboard');
          await PageObjects.dashboard.clickNewDashboard();
          await PageObjects.reporting.openPngReportingPanel();
          await expectDisabledGenerateReportButton();
        });

        it('becomes available when saved', async () => {
          await PageObjects.dashboard.saveDashboard('mypngdash');
          await PageObjects.reporting.openPngReportingPanel();
          await expectEnabledGenerateReportButton();
        });
      });

      // TODO Re-enable the tests after removing Phantom:
      // https://github.com/elastic/kibana/issues/21485
      describe.skip('Preserve Layout', () => {
        it('matches baseline report', async function () {

          // Generating and then comparing reports can take longer than the default 60s timeout because the comparePngs
          // function is taking about 15 seconds per comparison in jenkins.
          this.timeout(360000);

          await PageObjects.dashboard.switchToEditMode();
          await PageObjects.reporting.setTimepickerInDataRange();
          const visualizations = PageObjects.dashboard.getTestVisualizationNames();

          // There is a current issue causing reports with tilemaps to timeout:
          // https://github.com/elastic/kibana/issues/14136. Once that is resolved, add the tilemap visualization
          // back in!
          const tileMapIndex = visualizations.indexOf('Visualization TileMap');
          visualizations.splice(tileMapIndex, 1);
          await PageObjects.dashboard.addVisualizations(visualizations);

          await PageObjects.dashboard.saveDashboard('PNG report test');

          await PageObjects.reporting.openPngReportingPanel();
          await PageObjects.reporting.forceSharedItemsContainerSize({ width: 1405 });
          await PageObjects.reporting.clickGenerateReportButton();
          await PageObjects.reporting.removeForceSharedItemsContainerSize();

          await PageObjects.reporting.clickDownloadReportButton(60000);
          PageObjects.reporting.clearToastNotifications();

          const url = await PageObjects.reporting.getUrlOfTab(1);
          await PageObjects.reporting.closeTab(1);
          const reportData = await PageObjects.reporting.getRawPdfReportData(url);

          const reportFileName = 'dashboard_preserve_layout';
          const sessionReportPath = await writeSessionReport(reportFileName, reportData, 'png');
          const percentSimilar = await checkIfPngsMatch(
            sessionReportPath,
            getBaselineReportPath(reportFileName, 'png'),
            config.get('screenshots.directory'),
            log
          );
          expect(percentSimilar).to.be.lessThan(0.05);

        });
      });

    });

    describe('Discover', () => {
      describe('Generate CSV button', () => {
        beforeEach(() => PageObjects.common.navigateToApp('discover'));

        it('is not available if new', async () => {
          await PageObjects.reporting.openCsvReportingPanel();
          await expectDisabledGenerateReportButton();
        });

        it('becomes available when saved', async () => {
          await PageObjects.discover.saveSearch('my search - expectEnabledGenerateReportButton');
          await PageObjects.reporting.openCsvReportingPanel();
          await expectEnabledGenerateReportButton();
        });

        it('generates a report with data', async () => {
          await PageObjects.reporting.setTimepickerInDataRange();
          await PageObjects.discover.saveSearch('my search - with data - expectReportCanBeCreated');
          await PageObjects.reporting.openCsvReportingPanel();
          await expectReportCanBeCreated();
        });

        it('generates a report with no data', async () => {
          await PageObjects.reporting.setTimepickerInNoDataRange();
          await PageObjects.discover.saveSearch('my search - no data - expectReportCanBeCreated');
          await PageObjects.reporting.openCsvReportingPanel();
          await expectReportCanBeCreated();
        });
      });
    });

    describe('Visualize', () => {
      describe('Print PDF button', () => {
        it('is not available if new', async () => {
          await PageObjects.common.navigateToUrl('visualize', 'new');
          await PageObjects.visualize.clickAreaChart();
          await PageObjects.visualize.clickNewSearch();
          await PageObjects.reporting.openPdfReportingPanel();
          await expectDisabledGenerateReportButton();
        });

        it('becomes available when saved', async () => {
          await PageObjects.reporting.setTimepickerInDataRange();
          await PageObjects.visualize.clickBucket('X-Axis');
          await PageObjects.visualize.selectAggregation('Date Histogram');
          await PageObjects.visualize.clickGo();
          await PageObjects.visualize.saveVisualization('my viz');
          await PageObjects.reporting.openPdfReportingPanel();
          await expectEnabledGenerateReportButton();
        });

        // TODO Re-enable the tests after removing Phantom:
        // https://github.com/elastic/kibana/issues/21485
        it.skip('matches baseline report', async function () {
          // Generating and then comparing reports can take longer than the default 60s timeout because the comparePngs
          // function is taking about 15 seconds per comparison in jenkins.
          this.timeout(180000);

          await PageObjects.reporting.openPdfReportingPanel();
          await PageObjects.reporting.clickGenerateReportButton();
          await PageObjects.reporting.clickDownloadReportButton(60000);
          PageObjects.reporting.clearToastNotifications();

          const url = await PageObjects.reporting.getUrlOfTab(1);
          const reportData = await PageObjects.reporting.getRawPdfReportData(url);

          await PageObjects.reporting.closeTab(1);
          const reportFileName = 'visualize_print';
          const sessionReportPath = await writeSessionReport(reportFileName, reportData);
          const percentSimilar = await checkIfPdfsMatch(
            sessionReportPath,
            getBaselineReportPath(reportFileName),
            config.get('screenshots.directory'),
            log
          );
          expect(percentSimilar).to.be.lessThan(0.05);
        });
      });
    });
  });
}
