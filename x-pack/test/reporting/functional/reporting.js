/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import path from 'path';
import mkdirp from 'mkdirp';
import fs from 'fs';
import { promisify } from 'bluebird';
import { checkIfPdfsMatch } from './lib';
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(mkdirp);

const REPORTS_FOLDER = path.resolve(__dirname, 'reports');

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const config = getService('config');
  const PageObjects = getPageObjects(['reporting', 'common', 'dashboard', 'header', 'discover', 'visualize']);
  const log = getService('log');

  describe('Reporting', () => {

    before('initialize tests', async () => {
      await kibanaServer.uiSettings.disableToastAutohide();
      await PageObjects.reporting.initTests();
    });

    const expectUnsavedChangesWarning = async () => {
      await PageObjects.reporting.openReportingPanel();
      const warningExists = await PageObjects.reporting.getUnsavedChangesWarningExists();
      expect(warningExists).to.be(true);
      const buttonExists = await PageObjects.reporting.getGenerateReportButtonExists();
      expect(buttonExists).to.be(false);
    };

    const expectEnabledGenerateReportButton = async () => {
      await PageObjects.reporting.openReportingPanel();
      const printPdfButton = await PageObjects.reporting.getGenerateReportButton();
      await retry.try(async () => {
        const isDisabled = await printPdfButton.getProperty('disabled');
        expect(isDisabled).to.be(false);
      });
    };

    const expectReportCanBeCreated = async () => {
      await PageObjects.reporting.clickGenerateReportButton();
      const success = await PageObjects.reporting.checkForReportingToasts();
      expect(success).to.be(true);
    };

    const writeSessionReport = async (name, rawPdf) => {
      const sessionDirectory = path.resolve(REPORTS_FOLDER, 'session');
      await mkdirAsync(sessionDirectory);
      const sessionReportPath = path.resolve(sessionDirectory, `${name}.pdf`);
      await writeFileAsync(sessionReportPath, rawPdf);
      return sessionReportPath;
    };

    const getBaselineReportPath = (fileName) => {
      const baselineFolder = path.resolve(REPORTS_FOLDER, 'baseline');
      return path.resolve(baselineFolder, `${fileName}.pdf`);
    };

    describe('Dashboard', () => {
      describe('Print PDF button', () => {
        it('is not available if new', async () => {
          await PageObjects.common.navigateToApp('dashboard');
          await PageObjects.dashboard.clickNewDashboard();
          await expectUnsavedChangesWarning();
        });

        it('becomes available when saved', async () => {
          await PageObjects.dashboard.saveDashboard('mydash');
          await expectEnabledGenerateReportButton();
        });
      });

      describe('Print Layout', () => {
        it.skip('matches baseline report', async function () {
          // Generating and then comparing reports can take longer than the default 60s timeout because the comparePngs
          // function is taking about 15 seconds per comparison in jenkins.
          this.timeout(180000);

          await PageObjects.dashboard.clickEdit();
          await PageObjects.reporting.setTimepickerInDataRange();
          const visualizations = PageObjects.dashboard.getTestVisualizationNames();

          // There is a current issue causing reports with tilemaps to timeout:
          // https://github.com/elastic/kibana/issues/14136. Once that is resolved, add the tilemap visualization
          // back in!
          const tileMapIndex = visualizations.indexOf('Visualization TileMap');
          visualizations.splice(tileMapIndex, 1);
          await PageObjects.dashboard.addVisualizations(visualizations);

          await PageObjects.dashboard.saveDashboard('report test');

          await PageObjects.reporting.openReportingPanel();
          await PageObjects.reporting.clickGenerateReportButton();
          await PageObjects.reporting.clickDownloadReportButton(60000);

          const url = await PageObjects.reporting.getUrlOfTab(1);
          await PageObjects.reporting.closeTab(1);
          const reportData = await PageObjects.reporting.getRawPdfReportData(url);
          const reportFileName = 'dashboard_print';
          const sessionReportPath = await writeSessionReport(reportFileName, reportData);
          const diffCount = await checkIfPdfsMatch(
            sessionReportPath,
            getBaselineReportPath(reportFileName),
            config.get('screenshots.directory'),
            log
          );
          // After expected OS differences, the diff count came to be around 128k
          expect(diffCount).to.be.lessThan(128000);
        });

        it.skip('matches same baseline report with margins turned on', async function () {
          // Generating and then comparing reports can take longer than the default 60s timeout because the comparePngs
          // function is taking about 15 seconds per comparison in jenkins.
          this.timeout(180000);

          await PageObjects.dashboard.clickEdit();
          await PageObjects.dashboard.useMargins(true);
          await PageObjects.dashboard.saveDashboard('report test');
          await PageObjects.reporting.openReportingPanel();
          await PageObjects.reporting.clickGenerateReportButton();
          await PageObjects.reporting.clickDownloadReportButton(60000);

          const url = await PageObjects.reporting.getUrlOfTab(1);
          const reportData = await PageObjects.reporting.getRawPdfReportData(url);

          await PageObjects.reporting.closeTab(1);
          const reportFileName = 'dashboard_print';
          const sessionReportPath = await writeSessionReport(reportFileName, reportData);
          const diffCount = await checkIfPdfsMatch(
            sessionReportPath,
            getBaselineReportPath(reportFileName),
            config.get('screenshots.directory'),
            log
          );
          // After expected OS differences, the diff count came to be around 128k
          expect(diffCount).to.be.lessThan(128000);
        });
      });

      describe('Preserve Layout', () => {
        it.skip('matches baseline report', async function () {

          // Generating and then comparing reports can take longer than the default 60s timeout because the comparePngs
          // function is taking about 15 seconds per comparison in jenkins.
          this.timeout(180000);

          await PageObjects.reporting.openReportingPanel();
          await PageObjects.reporting.forceSharedItemsContainerSize({ width: 1405 });
          await PageObjects.reporting.clickPreserveLayoutOption();
          await PageObjects.reporting.clickGenerateReportButton();
          await PageObjects.reporting.removeForceSharedItemsContainerSize();

          await PageObjects.reporting.clickDownloadReportButton(60000);
          const url = await PageObjects.reporting.getUrlOfTab(1);
          await PageObjects.reporting.closeTab(1);
          const reportData = await PageObjects.reporting.getRawPdfReportData(url);

          const reportFileName = 'dashboard_preserve_layout';
          const sessionReportPath = await writeSessionReport(reportFileName, reportData);
          const diffCount = await checkIfPdfsMatch(
            sessionReportPath,
            getBaselineReportPath(reportFileName),
            config.get('screenshots.directory'),
            log
          );
          // After expected OS differences, the diff count came to be around 350k
          expect(diffCount).to.be.lessThan(350000);

        });
      });
    });

    describe('Discover', () => {
      describe('Generate CSV button', () => {
        it('is not available if new', async () => {
          await PageObjects.common.navigateToApp('discover');
          await expectUnsavedChangesWarning();
        });

        it('becomes available when saved', async () => {
          await PageObjects.discover.saveSearch('my search');
          await expectEnabledGenerateReportButton();
        });

        it('generates a report with data', async () => {
          await PageObjects.reporting.setTimepickerInDataRange();
          await PageObjects.reporting.clickTopNavReportingLink();
          await expectReportCanBeCreated();
        });

        it('generates a report with no data', async () => {
          await PageObjects.reporting.setTimepickerInNoDataRange();
          await PageObjects.reporting.clickTopNavReportingLink();
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
          await expectUnsavedChangesWarning();
        });

        it('becomes available when saved', async () => {
          await PageObjects.visualize.saveVisualization('my viz');
          await expectEnabledGenerateReportButton();
        });

        it('generates a report', async () => await expectReportCanBeCreated());
      });
    });
  });
}
