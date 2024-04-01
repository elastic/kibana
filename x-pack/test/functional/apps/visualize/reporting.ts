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

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const log = getService('log');
  const config = getService('config');
  const kibanaServer = getService('kibanaServer');
  const png = getService('png');

  const PageObjects = getPageObjects([
    'reporting',
    'common',
    'dashboard',
    'timePicker',
    'visualize',
    'visEditor',
  ]);

  describe.only('Visualize Reporting Screenshots', function () {
    this.tags(['smoke']);
    before(async () => {
      await browser.setWindowSize(1600, 850);
    });
    after(async () => {
      await es.deleteByQuery({
        index: '.reporting-*',
        refresh: true,
        body: { query: { match_all: {} } },
      });
    });

    describe('Print PDF button', () => {
      const ecommerceSOPath =
        'x-pack/test/functional/fixtures/kbn_archiver/reporting/ecommerce.json';

      before('initialize tests', async () => {
        log.debug('ReportingPage:initTests');
        await esArchiver.load('x-pack/test/functional/es_archives/reporting/ecommerce');
        await kibanaServer.importExport.load(ecommerceSOPath);
        await kibanaServer.uiSettings.replace({
          'timepicker:timeDefaults':
            '{ "from": "2019-04-27T23:56:51.374Z", "to": "2019-08-23T16:18:51.821Z"}',
          defaultIndex: '5193f870-d861-11e9-a311-0fa548c5f953',
        });
      });
      after('clean up archives', async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/reporting/ecommerce');
        await kibanaServer.importExport.unload(ecommerceSOPath);
        await es.deleteByQuery({
          index: '.reporting-*',
          refresh: true,
          body: { query: { match_all: {} } },
        });
        await kibanaServer.uiSettings.unset('timepicker:timeDefaults');
      });

      it('is available if new', async () => {
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await PageObjects.visualize.clickNewVisualization();
        await PageObjects.visualize.clickAggBasedVisualizations();
        await PageObjects.visualize.clickAreaChart();
        await PageObjects.visualize.clickNewSearch('ecommerce');
        await PageObjects.reporting.openPdfReportingPanel();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
      });

      it('becomes available when saved', async () => {
        await PageObjects.visEditor.clickBucket('X-axis');
        await PageObjects.visEditor.selectAggregation('Date Histogram');
        await PageObjects.visEditor.clickGo();
        await PageObjects.visualize.saveVisualization('my viz');
        await PageObjects.reporting.openPdfReportingPanel();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
      });
    });

    describe('PNG reports: sample data created in 7.6', () => {
      const reportFileName = 'tsvb';

      before(async () => {
        await kibanaServer.uiSettings.replace({
          'timepicker:timeDefaults':
            '{ "from": "2022-04-15T00:00:00.000Z", "to": "2022-05-22T00:00:00.000Z"}',
          defaultIndex: '5193f870-d861-11e9-a311-0fa548c5f953',
        });

        await esArchiver.load('x-pack/test/functional/es_archives/reporting/ecommerce_76');
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/reporting/ecommerce_76.json'
        );

        log.debug('navigate to visualize');
        await PageObjects.common.navigateToApp('visualize');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/reporting/ecommerce_76');
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/reporting/ecommerce_76.json'
        );
      });

      it('TSVB Gauge: PNG file matches the baseline image', async function () {
        log.debug('load saved visualization');
        await PageObjects.visualize.loadSavedVisualization(
          '[K7.6-eCommerce] Sold Products per Day',
          { navigateToVisualize: false }
        );

        log.debug('open png reporting panel');
        await PageObjects.reporting.openPngReportingPanel();
        log.debug('click generate report button');
        await PageObjects.reporting.clickGenerateReportButton();

        log.debug('get the report download URL');
        const url = await PageObjects.reporting.getReportURL(60000);
        log.debug('download the report');
        const reportData = await PageObjects.reporting.getRawPdfReportData(url);
        const sessionReportPath = await PageObjects.reporting.writeSessionReport(
          reportFileName,
          'png',
          reportData,
          REPORTS_FOLDER
        );

        // check the file
        const percentDiff = await png.checkIfPngsMatch(
          sessionReportPath,
          PageObjects.reporting.getBaselineReportPath(reportFileName, 'png', REPORTS_FOLDER),
          config.get('screenshots.directory')
        );

        expect(percentDiff).to.be.lessThan(0.01);
      });
    });
  });
}
