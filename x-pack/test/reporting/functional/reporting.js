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

export default function({ getService, getPageObjects }) {
  const retry = getService('retry');
  const config = getService('config');
  const PageObjects = getPageObjects([
    'reporting',
    'common',
    'dashboard',
    'header',
    'discover',
    'visualize',
    'visEditor',
  ]);
  const log = getService('log');

  describe('Reporting', () => {
    before('initialize tests', async () => {
      await PageObjects.reporting.initTests();
    });

    const expectDisabledGenerateReportButton = async () => {
      const generateReportButton = await PageObjects.reporting.getGenerateReportButton();
      await retry.try(async () => {
        const isDisabled = await generateReportButton.getAttribute('disabled');
        expect(isDisabled).to.be('true');
      });
    };

    const expectEnabledGenerateReportButton = async () => {
      const generateReportButton = await PageObjects.reporting.getGenerateReportButton();
      await retry.try(async () => {
        const isDisabled = await generateReportButton.getAttribute('disabled');
        expect(isDisabled).to.be(null);
      });
    };

    const expectReportCanBeCreated = async () => {
      await PageObjects.reporting.clickGenerateReportButton();
      const success = await PageObjects.reporting.checkForReportingToasts();
      expect(success).to.be(true);
    };

    const writeSessionReport = async (name, rawPdf, reportExt = 'pdf') => {
      const sessionDirectory = path.resolve(REPORTS_FOLDER, 'session');
      await mkdirAsync(sessionDirectory, { recursive: true });
      const sessionReportPath = path.resolve(sessionDirectory, `${name}.${reportExt}`);
      await writeFileAsync(sessionReportPath, rawPdf);
      return sessionReportPath;
    };

    const getBaselineReportPath = (fileName, reportExt = 'pdf') => {
      const baselineFolder = path.resolve(REPORTS_FOLDER, 'baseline');
      const fullPath = path.resolve(baselineFolder, `${fileName}.${reportExt}`);
      log.debug(`getBaselineReportPath (${fullPath})`);
      return fullPath;
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
          await PageObjects.dashboard.saveDashboard('My PDF Dashboard');
          await PageObjects.reporting.openPdfReportingPanel();
          await expectEnabledGenerateReportButton();
        });
      });

      describe('Print Layout', () => {
        it('downloads a PDF file', async function() {
          // Generating and then comparing reports can take longer than the default 60s timeout because the comparePngs
          // function is taking about 15 seconds per comparison in jenkins.
          this.timeout(300000);
          await PageObjects.common.navigateToApp('dashboard');
          await PageObjects.dashboard.gotoDashboardEditMode('My PDF Dashboard');
          await PageObjects.reporting.setTimepickerInDataRange();
          const visualizations = PageObjects.dashboard.getTestVisualizationNames();

          const tileMapIndex = visualizations.indexOf('Visualization TileMap');
          visualizations.splice(tileMapIndex, 1);

          await PageObjects.dashboard.addVisualizations(visualizations);
          await PageObjects.dashboard.saveDashboard('report test');
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
          await expectDisabledGenerateReportButton();
        });

        it('becomes available when saved', async () => {
          await PageObjects.dashboard.saveDashboard('My PNG Dash');
          await PageObjects.reporting.openPngReportingPanel();
          await expectEnabledGenerateReportButton();
        });
      });

      describe('Preserve Layout', () => {
        it('matches baseline report', async function() {
          this.timeout(300000);

          await PageObjects.common.navigateToApp('dashboard');
          await PageObjects.dashboard.gotoDashboardEditMode('My PNG Dash');
          await PageObjects.reporting.setTimepickerInDataRange();

          const visualizations = PageObjects.dashboard.getTestVisualizationNames();
          const tileMapIndex = visualizations.indexOf('Visualization TileMap');
          visualizations.splice(tileMapIndex, 1);

          await PageObjects.dashboard.addVisualizations(visualizations);
          await PageObjects.dashboard.saveDashboard('PNG report test');
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
          await PageObjects.visEditor.clickBucket('X-axis');
          await PageObjects.visEditor.selectAggregation('Date Histogram');
          await PageObjects.visEditor.clickGo();
          await PageObjects.visualize.saveVisualization('my viz');
          await PageObjects.reporting.openPdfReportingPanel();
          await expectEnabledGenerateReportButton();
        });

        it('matches baseline report', async function() {
          // Generating and then comparing reports can take longer than the default 60s timeout because the comparePngs
          // function is taking about 15 seconds per comparison in jenkins.
          this.timeout(180000);

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
